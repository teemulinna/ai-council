/**
 * BDD Scenario Tests for Preset Workflows
 * Tests complete user workflows using Given-When-Then patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CouncilChip from '../CouncilChip';
import * as api from '../../api';

vi.mock('../../api', () => ({
  api: {
    listRoles: vi.fn(),
    listModels: vi.fn(),
    listPresets: vi.fn(),
    composeFromPreset: vi.fn(),
  }
}));

describe('BDD: Preset Workflows', () => {
  const mockPresets = [
    {
      id: 'balanced',
      name: 'Balanced Council',
      description: 'Well-rounded perspectives with 5 diverse roles',
      icon: '⚖️',
      agent_count: 5,
      estimated_cost: 0.18
    },
    {
      id: 'creative_boost',
      name: 'Creative Boost',
      description: 'Enhanced creativity with multiple creative thinkers',
      icon: '💡',
      agent_count: 6,
      estimated_cost: 0.20
    },
    {
      id: 'debate_mode',
      name: 'Debate Mode',
      description: "Vigorous debate with multiple devil's advocates",
      icon: '⚡',
      agent_count: 7,
      estimated_cost: 0.24
    },
    {
      id: 'quick_answer',
      name: 'Quick Answer',
      description: 'Fast response with minimal agents',
      icon: '⚡',
      agent_count: 3,
      estimated_cost: 0.12
    }
  ];

  const mockRoles = [
    {
      id: 'primary_responder',
      name: 'primary_responder',
      display_name: 'Primary Responder',
      description: 'Main response',
      priority: 1
    }
  ];

  const mockModels = {
    premium: ['openai/gpt-4'],
    standard: ['openai/gpt-3.5-turbo'],
    budget: ['meta-llama/llama-2-70b']
  };

  const mockCouncil = {
    agents: [
      { role: mockRoles[0], model: 'openai/gpt-4', custom_prompt: null }
    ],
    agent_count: 1,
    preset_id: 'balanced'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.api.listRoles.mockResolvedValue({ roles: mockRoles });
    api.api.listModels.mockResolvedValue(mockModels);
    api.api.listPresets.mockResolvedValue({ presets: mockPresets });
    api.api.composeFromPreset.mockResolvedValue(mockCouncil);
  });

  describe('Scenario: User wants quick expert analysis', () => {
    it('Given user needs fast response, When selecting Quick Answer preset, Then 3-agent council is used', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User needs a fast response for a simple question
      render(<CouncilChip onCouncilSelect={onCouncilSelect} />);

      // WHEN: User opens council settings
      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // AND: User switches to preset mode
      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      // THEN: User sees Quick Answer preset
      await waitFor(() => {
        expect(screen.getByText('Quick Answer')).toBeInTheDocument();
        expect(screen.getByText('Fast response with minimal agents')).toBeInTheDocument();
        expect(screen.getByText('3 agents')).toBeInTheDocument();
        expect(screen.getByText('$0.12')).toBeInTheDocument();
      });

      // WHEN: User selects Quick Answer
      const quickCard = screen.getByText('Quick Answer').closest('.preset-card');
      await user.click(quickCard);

      // THEN: Preset loads
      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalledWith('quick_answer');
      });

      // WHEN: User clicks Use Once
      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      // THEN: Quick Answer council is applied
      expect(onCouncilSelect).toHaveBeenCalled();
    });
  });

  describe('Scenario: User wants comprehensive analysis', () => {
    it('Given user has complex question, When browsing presets, Then user compares options and selects best fit', async () => {
      const user = userEvent.setup();

      // GIVEN: User has a complex multi-faceted question
      render(<CouncilChip />);

      // WHEN: User opens council settings
      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // AND: User switches to preset mode to explore options
      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      // THEN: User sees all preset options with details
      await waitFor(() => {
        // Quick Answer - too simple
        expect(screen.getByText('Quick Answer')).toBeInTheDocument();
        expect(screen.getByText('3 agents')).toBeInTheDocument();

        // Balanced Council - good baseline
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
        expect(screen.getByText('5 agents')).toBeInTheDocument();

        // Creative Boost - for creative problems
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
        expect(screen.getByText('6 agents')).toBeInTheDocument();

        // Debate Mode - for controversial topics
        expect(screen.getByText('Debate Mode')).toBeInTheDocument();
        expect(screen.getByText('7 agents')).toBeInTheDocument();
      });

      // WHEN: User decides Debate Mode fits their controversial topic
      const debateCard = screen.getByText('Debate Mode').closest('.preset-card');

      // THEN: User can see it's more expensive but worth it
      const costElement = debateCard.querySelector('.preset-card__cost');
      expect(costElement).toHaveTextContent('$0.24');

      // WHEN: User selects Debate Mode
      await user.click(debateCard);

      // THEN: 7-agent debate council loads
      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalledWith('debate_mode');
      });
    });
  });

  describe('Scenario: User customizes a preset', () => {
    it('Given user likes Creative Boost but wants GPT-4, When customizing preset, Then user modifies and uses it', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User likes Creative Boost preset but wants premium models
      render(<CouncilChip onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      // WHEN: User selects Creative Boost
      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-card');
      await user.click(creativeCard);

      // THEN: Customization panel appears
      await waitFor(() => {
        expect(screen.getByText(/customize "creative boost"/i)).toBeInTheDocument();
      });

      // AND: User can see the agents
      await waitFor(() => {
        const agentCards = screen.getAllByText(/#\d+/);
        expect(agentCards.length).toBeGreaterThan(0);
      });

      // WHEN: User expands first agent
      const firstAgentHeader = screen.getAllByRole('button', { name: /expand/i })[0];
      await user.click(firstAgentHeader);

      // THEN: User can modify the agent (tested in Phase 1)
      // (Agent customization already tested in AgentCard.test.jsx)

      // WHEN: User decides to use the preset as-is or customized
      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      // THEN: Customized Creative Boost is applied
      expect(onCouncilSelect).toHaveBeenCalled();
    });
  });

  describe('Scenario: User switches between different presets', () => {
    it('Given user explores options, When switching between presets, Then each preset loads correctly', async () => {
      const user = userEvent.setup();

      // GIVEN: User wants to explore different preset options
      render(<CouncilChip />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      // WHEN: User clicks Balanced Council
      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      // THEN: Balanced loads
      await waitFor(() => {
        expect(balancedCard).toHaveClass('selected');
      });

      expect(api.api.composeFromPreset).toHaveBeenCalledWith('balanced');

      // WHEN: User changes mind and clicks Creative Boost
      const creativeCard = screen.getByText('Creative Boost').closest('.preset-card');
      await user.click(creativeCard);

      // THEN: Creative Boost loads and Balanced is deselected
      await waitFor(() => {
        expect(creativeCard).toHaveClass('selected');
        expect(balancedCard).not.toHaveClass('selected');
      });

      expect(api.api.composeFromPreset).toHaveBeenCalledWith('creative_boost');

      // WHEN: User tries Debate Mode
      const debateCard = screen.getByText('Debate Mode').closest('.preset-card');
      await user.click(debateCard);

      // THEN: Debate Mode loads
      await waitFor(() => {
        expect(debateCard).toHaveClass('selected');
        expect(creativeCard).not.toHaveClass('selected');
      });

      expect(api.api.composeFromPreset).toHaveBeenCalledWith('debate_mode');
    });
  });

  describe('Scenario: User cancels preset selection', () => {
    it('Given user browsed presets, When canceling, Then no preset is applied', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();

      // GIVEN: User explores preset options
      render(<CouncilChip onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      // WHEN: User selects a preset
      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-card');
      await user.click(creativeCard);

      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalled();
      });

      // WHEN: User decides not to use it and clicks Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // THEN: Panel closes without applying preset
      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });

      expect(onCouncilSelect).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: User understands cost differences', () => {
    it('Given user is cost-conscious, When reviewing presets, Then user can compare costs', async () => {
      const user = userEvent.setup();

      // GIVEN: User wants to understand cost implications
      render(<CouncilChip />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      // THEN: User sees all costs clearly displayed
      await waitFor(() => {
        // Quick Answer - cheapest
        expect(screen.getByText('$0.12')).toBeInTheDocument();

        // Balanced - mid-range
        expect(screen.getByText('$0.18')).toBeInTheDocument();

        // Creative Boost - slightly more
        expect(screen.getByText('$0.20')).toBeInTheDocument();

        // Debate Mode - most expensive
        expect(screen.getByText('$0.24')).toBeInTheDocument();
      });

      // WHEN: User identifies that Debate Mode has 7 agents vs Quick Answer's 3
      const quickCard = screen.getByText('Quick Answer').closest('.preset-card');
      const debateCard = screen.getByText('Debate Mode').closest('.preset-card');

      const quickAgents = quickCard.querySelector('.preset-card__agents');
      const debateAgents = debateCard.querySelector('.preset-card__agents');

      // THEN: User understands more agents = higher cost
      expect(quickAgents).toHaveTextContent('3 agents');
      expect(debateAgents).toHaveTextContent('7 agents');
    });
  });
});
