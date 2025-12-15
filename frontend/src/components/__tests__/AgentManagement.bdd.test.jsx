/**
 * BDD Scenario Tests for Agent Management Flow
 * Tests complete user workflows using Given-When-Then patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CouncilChip from '../CouncilChip';
import * as api from '../../api';

vi.mock('../../api', () => ({
  api: {
    listRoles: vi.fn(),
    listModels: vi.fn(),
    composeCouncil: vi.fn(),
    listPresets: vi.fn()
  }
}));

describe('BDD: Agent Management Workflows', () => {
  const mockRoles = [
    {
      id: 'primary_responder',
      display_name: 'Primary Responder',
      description: 'Provides main response to the query',
      prompt_modifier: 'You are the primary responder.'
    },
    {
      id: 'devils_advocate',
      display_name: "Devil's Advocate",
      description: 'Challenges assumptions',
      prompt_modifier: 'You challenge assumptions.'
    },
    {
      id: 'fact_checker',
      display_name: 'Fact Checker',
      description: 'Verifies accuracy',
      prompt_modifier: 'You verify facts.'
    },
    {
      id: 'creative_thinker',
      display_name: 'Creative Thinker',
      description: 'Thinks outside the box',
      prompt_modifier: 'You think creatively.'
    },
    {
      id: 'practical_advisor',
      display_name: 'Practical Advisor',
      description: 'Provides practical guidance',
      prompt_modifier: 'You provide practical advice.'
    }
  ];

  const mockModels = {
    premium: ['openai/gpt-4', 'anthropic/claude-3-opus'],
    standard: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-sonnet'],
    budget: ['meta-llama/llama-2-70b']
  };

  const defaultProps = {
    defaultCouncil: null,
    onCouncilSelect: vi.fn(),
    compact: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.api.listRoles.mockResolvedValue({ roles: mockRoles });
    api.api.listModels.mockResolvedValue(mockModels);
    api.api.listPresets.mockResolvedValue({ presets: [] });
  });

  describe('Scenario: User wants to quickly send a message with default council', () => {
    it('Given default council is configured, When user sends message, Then default council is used without interaction', async () => {
      // GIVEN: Default council is configured
      const defaultCouncil = {
        agents: mockRoles.slice(0, 5).map(role => ({ role, model: 'openai/gpt-4' })),
        agent_count: 5
      };

      const onCouncilSelect = vi.fn();
      render(<CouncilChip {...defaultProps} defaultCouncil={defaultCouncil} onCouncilSelect={onCouncilSelect} />);

      // WHEN: User sees the council chip showing default
      expect(screen.getByText('Default (5 agents)')).toBeInTheDocument();

      // THEN: User can send message directly without opening the chip
      // (In real app, user would just click Send without interacting with chip)
      expect(onCouncilSelect).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: User wants to use default council for one message', () => {
    it('Given user wants to override custom council temporarily, When Use Once clicked, Then default council used once', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User has been using custom council, but wants to use default for this message
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      // WHEN: User opens the council settings
      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // AND: User confirms they want default mode
      const defaultRadio = screen.getByRole('radio', { name: /default council/i });
      expect(defaultRadio).toBeChecked(); // Already checked by default

      // AND: User clicks "Use Once"
      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      // THEN: Default council is selected for this message
      expect(onCouncilSelect).toHaveBeenCalledWith(null);

      // AND: Panel closes
      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Scenario: User creates custom council with specific models', () => {
    it('Given user wants specific AI models, When configuring custom agents, Then each agent can have different model', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User opens council settings
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // WHEN: User switches to custom mode
      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      // THEN: Agent configuration section appears
      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      // AND: User sees initially loaded agents
      await waitFor(() => {
        const agentCards = screen.getAllByText(/#\d+/);
        expect(agentCards.length).toBeGreaterThan(0);
      });

      // WHEN: User expands first agent
      const firstAgentHeader = screen.getAllByRole('button', { name: /expand/i })[0];
      await user.click(firstAgentHeader);

      // THEN: User can select a model
      await waitFor(() => {
        const comboboxes = screen.getAllByRole('combobox');
        expect(comboboxes.length).toBeGreaterThanOrEqual(1);
      });

      // WHEN: User selects GPT-4
      // Get all comboboxes and select the first one (model selector)
      // First combobox is the model selector, second is the role selector
      const comboboxes = screen.getAllByRole('combobox');
      const modelSelect = comboboxes[0];
      await user.selectOptions(modelSelect, 'openai/gpt-4');

      // THEN: Model selection is updated
      expect(modelSelect).toHaveValue('openai/gpt-4');
    });
  });

  describe('Scenario: User customizes agent prompts', () => {
    it('Given user wants specialized instructions, When editing prompt, Then custom prompt is saved', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User is in custom mode with agents configured
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      // WHEN: User expands an agent card
      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      const firstAgentHeader = screen.getAllByRole('button', { name: /expand/i })[0];
      await user.click(firstAgentHeader);

      // THEN: User sees the default prompt
      await waitFor(() => {
        expect(screen.getByText(/you are the primary responder/i)).toBeInTheDocument();
      });

      // WHEN: User clicks "Edit Instructions"
      const editButton = screen.getByRole('button', { name: /edit instructions/i });
      await user.click(editButton);

      // THEN: Textarea appears for editing
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();

      // WHEN: User enters custom instructions
      await user.clear(textarea);
      await user.type(textarea, 'Focus on technical accuracy and provide code examples.');

      // AND: User clicks Save
      const saveButton = screen.getByRole('button', { name: /save instructions/i });
      await user.click(saveButton);

      // THEN: Edit mode closes and custom prompt is saved
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Scenario: User adds and removes agents', () => {
    it('Given user needs more perspectives, When adding/removing agents, Then council composition updates', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User is in custom mode
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      // WHEN: User counts initial agents
      const initialAgentCount = screen.getAllByText(/#\d+/).length;

      // AND: User clicks "Add Agent"
      const addButton = screen.getByText(/\+ add agent/i);
      await user.click(addButton);

      // THEN: New agent is added
      await waitFor(() => {
        const newAgentCount = screen.getAllByText(/#\d+/).length;
        expect(newAgentCount).toBe(initialAgentCount + 1);
      });

      // WHEN: User expands the new agent and removes it
      const lastAgentHeader = screen.getAllByRole('button', { name: /expand/i }).pop();
      await user.click(lastAgentHeader);

      await waitFor(() => {
        expect(screen.getByText('Remove from Council')).toBeInTheDocument();
      });

      const removeButton = screen.getByText('Remove from Council');
      await user.click(removeButton);

      // THEN: Agent is removed
      await waitFor(() => {
        const finalAgentCount = screen.getAllByText(/#\d+/).length;
        expect(finalAgentCount).toBe(initialAgentCount);
      });
    });
  });

  describe('Scenario: User saves custom council as default', () => {
    it('Given user has configured perfect council, When saving as default, Then configuration is preserved', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User has configured a custom council
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      // WHEN: User clicks "Save as Default"
      const saveButton = screen.getByRole('button', { name: /save as default/i });

      // THEN: Button is enabled
      expect(saveButton).not.toBeDisabled();

      // WHEN: User saves
      await user.click(saveButton);

      // THEN: Council is saved and panel closes
      expect(onCouncilSelect).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Scenario: User cancels council configuration', () => {
    it('Given user started customization, When canceling, Then changes are discarded', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User opens settings and makes changes
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      // WHEN: User adds an agent
      const addButton = screen.getByText(/\+ add agent/i);
      await user.click(addButton);

      await waitFor(() => {
        // Wait for agent to be added
        const agentCards = screen.getAllByText(/#\d+/);
        expect(agentCards.length).toBeGreaterThan(5);
      });

      // AND: User clicks Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // THEN: Panel closes without saving
      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });

      // AND: onCouncilSelect was not called
      expect(onCouncilSelect).not.toHaveBeenCalled();

      // Note: State is preserved in component even after cancel,
      // but council was not applied, which is the correct behavior
    });
  });

  describe('Scenario: User navigates between default and custom modes', () => {
    it('Given user explores options, When switching modes, Then appropriate UI appears', async () => {
      const user = userEvent.setup();

      // GIVEN: User opens council settings
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // WHEN: User is in default mode
      const defaultRadio = screen.getByRole('radio', { name: /default council/i });
      expect(defaultRadio).toBeChecked();

      // THEN: Agent configuration is hidden
      expect(screen.queryByText(/configure agents/i)).not.toBeInTheDocument();

      // AND: Save as Default button is hidden
      expect(screen.queryByRole('button', { name: /save as default/i })).not.toBeInTheDocument();

      // WHEN: User switches to custom mode
      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      // THEN: Agent configuration appears
      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      // AND: Save as Default button appears
      expect(screen.getByRole('button', { name: /save as default/i })).toBeInTheDocument();

      // WHEN: User switches back to default
      await user.click(defaultRadio);

      // THEN: Agent configuration is hidden again
      expect(screen.queryByText(/configure agents/i)).not.toBeInTheDocument();
    });
  });

  describe('Scenario: User works with compact mode on mobile', () => {
    it('Given user on mobile, When using compact chip, Then essential features remain accessible', async () => {
      const user = userEvent.setup();

      // GIVEN: Compact mode is enabled (mobile)
      render(<CouncilChip {...defaultProps} compact={true} />);

      // THEN: Chip shows icon only
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.queryByText('Council:')).not.toBeInTheDocument();

      // WHEN: User clicks chip
      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // THEN: Full panel still appears with all options
      expect(screen.getByText('Council Settings')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /default council/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /custom council/i })).toBeInTheDocument();
    });
  });
});
