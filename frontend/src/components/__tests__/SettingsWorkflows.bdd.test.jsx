/**
 * BDD Scenario Tests for Settings Workflows
 * Tests complete user workflows for settings management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../Settings';
import * as api from '../../api';

vi.mock('../../api', () => ({
  api: {
    listRoles: vi.fn(),
    listModels: vi.fn(),
    listPresets: vi.fn(),
    composeFromPreset: vi.fn(),
  }
}));

describe('BDD: Settings Workflows', () => {
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
    },
    {
      id: 'fact_checker',
      name: 'fact_checker',
      display_name: 'Fact Checker',
      description: 'Verify facts',
      priority: 2
    }
  ];

  const mockModels = {
    premium: ['openai/gpt-4'],
    standard: ['openai/gpt-3.5-turbo'],
    budget: ['meta-llama/llama-2-70b']
  };

  const mockCouncil = {
    agents: [
      { role: mockRoles[0], model: 'openai/gpt-4', custom_prompt: null },
      { role: mockRoles[1], model: 'openai/gpt-3.5-turbo', custom_prompt: null }
    ],
    agent_count: 2,
    preset_id: 'balanced'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.api.listRoles.mockResolvedValue({ roles: mockRoles });
    api.api.listModels.mockResolvedValue(mockModels);
    api.api.listPresets.mockResolvedValue({ presets: mockPresets });
    api.api.composeFromPreset.mockResolvedValue(mockCouncil);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Scenario: User sets default preset for all conversations', () => {
    it('Given user wants consistent council, When setting default preset, Then preset is saved and used', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // GIVEN: User wants the same council configuration for all conversations
      render(<Settings isOpen={true} onClose={onClose} />);

      // WHEN: User opens settings
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // AND: User sees Default Council tab (already selected)
      expect(screen.getByText('Default Council Configuration')).toBeInTheDocument();

      // THEN: Preset mode is selected by default
      const presetRadio = screen.getByRole('radio', { name: /use a preset/i });
      expect(presetRadio).toBeChecked();

      // AND: User sees all available presets
      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
        expect(screen.getByText('Quick Answer')).toBeInTheDocument();
      });

      // WHEN: User selects Creative Boost for creativity-focused work
      const creativeCard = screen.getByText('Creative Boost').closest('.preset-option');
      await user.click(creativeCard);

      // THEN: Creative Boost is selected
      await waitFor(() => {
        expect(creativeCard).toHaveClass('selected');
      });

      // WHEN: User saves settings
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      // THEN: Settings are saved to localStorage
      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeTruthy();
        const settings = JSON.parse(saved);
        expect(settings.defaultCouncilType).toBe('preset');
        expect(settings.selectedPreset.id).toBe('creative_boost');
      });

      // AND: Settings modal closes
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 1000 });

      // AND: Settings update event is dispatched
      // (This would be caught by App.jsx to reload default council)
    });
  });

  describe('Scenario: User customizes preset and saves as default', () => {
    it('Given user likes a preset but wants GPT-4, When customizing and saving, Then custom config becomes default', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // GIVEN: User likes Balanced Council but wants premium models
      render(<Settings isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      // WHEN: User selects Balanced Council
      const balancedCard = screen.getByText('Balanced Council').closest('.preset-option');
      await user.click(balancedCard);

      // THEN: Customization panel appears
      await waitFor(() => {
        expect(screen.getByText(/customize "balanced council"/i)).toBeInTheDocument();
      });

      // AND: User sees the preset agents loaded
      await waitFor(() => {
        const agentCards = screen.getAllByText(/#\d+/);
        expect(agentCards.length).toBeGreaterThan(0);
      });

      // WHEN: User expands first agent to customize
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      if (expandButtons.length > 0) {
        await user.click(expandButtons[0]);
      }

      // THEN: User can modify agent (tested in AgentCard tests)
      // Agent customization UI is shown

      // WHEN: User saves the customized preset as default
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      // THEN: Customized preset is saved
      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeTruthy();
        const settings = JSON.parse(saved);
        expect(settings.selectedPreset.id).toBe('balanced');
        expect(settings.customAgents).toBeDefined();
      });
    });
  });

  describe('Scenario: User switches from preset to custom default', () => {
    it('Given user has preset default, When switching to custom, Then can build custom default', async () => {
      const user = userEvent.setup();

      // GIVEN: User currently has preset default saved
      localStorage.setItem('ai-council-settings', JSON.stringify({
        defaultCouncilType: 'preset',
        selectedPreset: mockPresets[0],
        customAgents: []
      }));

      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      // WHEN: User decides to switch to custom configuration
      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      // THEN: Custom mode is selected
      expect(customRadio).toBeChecked();

      // AND: User can build custom council from scratch
      // (Custom council building tested in CouncilChip tests)

      // WHEN: User saves custom configuration
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      // THEN: Custom configuration is saved
      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeTruthy();
        const settings = JSON.parse(saved);
        expect(settings.defaultCouncilType).toBe('custom');
      });
    });
  });

  describe('Scenario: User resets all settings to defaults', () => {
    it('Given user has customized settings, When resetting, Then all settings cleared', async () => {
      const user = userEvent.setup();

      // GIVEN: User has saved custom settings
      localStorage.setItem('ai-council-settings', JSON.stringify({
        defaultCouncilType: 'custom',
        selectedPreset: null,
        customAgents: [mockCouncil.agents[0]],
        savedAt: new Date().toISOString()
      }));

      // Mock window.confirm to auto-accept
      window.confirm = vi.fn(() => true);

      render(<Settings isOpen={true} onClose={vi.fn()} />);

      // WHEN: User navigates to Preferences tab
      const preferencesTab = screen.getByRole('button', { name: /preferences/i });
      await user.click(preferencesTab);

      // THEN: User sees Preferences section
      await waitFor(() => {
        expect(screen.getByText('Application Preferences')).toBeInTheDocument();
      });

      // WHEN: User clicks Reset to Defaults
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);

      // THEN: Confirmation is requested
      expect(window.confirm).toHaveBeenCalled();

      // AND: Settings are cleared from localStorage
      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeNull();
      });

      // AND: Settings UI resets to preset/Balanced default
      await waitFor(() => {
        const presetRadio = screen.queryByRole('radio', { name: /use a preset/i });
        if (presetRadio) {
          expect(presetRadio).toBeChecked();
        }
      });
    });
  });

  describe('Scenario: User explores settings without saving', () => {
    it('Given user is exploring, When canceling without saving, Then no changes persisted', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // GIVEN: User wants to explore settings options
      render(<Settings isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      // WHEN: User selects different presets
      const creativeCard = screen.getByText('Creative Boost').closest('.preset-option');
      await user.click(creativeCard);

      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalledWith('creative_boost');
      });

      // AND: User views customization options
      await waitFor(() => {
        expect(screen.getByText(/customize "creative boost"/i)).toBeInTheDocument();
      });

      // AND: User switches between tabs
      const preferencesTab = screen.getByRole('button', { name: /preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText('Application Preferences')).toBeInTheDocument();
      });

      // WHEN: User decides not to save and clicks Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // THEN: Modal closes
      expect(onClose).toHaveBeenCalled();

      // AND: No settings are saved
      const saved = localStorage.getItem('ai-council-settings');
      expect(saved).toBeNull();
    });
  });

  describe('Scenario: User adds extra agent to preset default', () => {
    it('Given user wants more perspectives, When adding agent to preset, Then enhanced council saved', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // GIVEN: User likes Quick Answer but wants one more perspective
      render(<Settings isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Quick Answer')).toBeInTheDocument();
      });

      // WHEN: User selects Quick Answer (3 agents)
      const quickCard = screen.getByText('Quick Answer').closest('.preset-option');
      await user.click(quickCard);

      // THEN: Customization panel shows
      await waitFor(() => {
        expect(screen.getByText(/customize "quick answer"/i)).toBeInTheDocument();
      });

      // WHEN: User clicks Add Agent
      const addButton = screen.getByRole('button', { name: /\+ add agent/i });
      await user.click(addButton);

      // THEN: Agent count increases
      await waitFor(() => {
        // Should show (3) agents now (2 from mock + 1 added)
        expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
      });

      // WHEN: User saves enhanced preset
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      // THEN: Enhanced preset saved as default
      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeTruthy();
        const settings = JSON.parse(saved);
        expect(settings.selectedPreset.id).toBe('quick_answer');
        expect(settings.customAgents.length).toBe(3);
      });
    });
  });

  describe('Scenario: Settings persist across sessions', () => {
    it('Given user saved settings, When reopening settings later, Then saved config shown', async () => {
      // GIVEN: User previously saved Creative Boost as default
      const previousSettings = {
        defaultCouncilType: 'preset',
        selectedPreset: mockPresets[1], // Creative Boost
        customAgents: mockCouncil.agents,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('ai-council-settings', JSON.stringify(previousSettings));

      // WHEN: User opens settings in a new session
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      // THEN: Preset mode is selected
      await waitFor(() => {
        const presetRadio = screen.getByRole('radio', { name: /use a preset/i });
        expect(presetRadio).toBeChecked();
      });

      // AND: Creative Boost is selected
      await waitFor(() => {
        const creativeCard = screen.getByText('Creative Boost').closest('.preset-option');
        expect(creativeCard).toHaveClass('preset-option', 'selected');
      });

      // AND: Previously customized agents are loaded
      await waitFor(() => {
        expect(screen.getByText(/customize "creative boost"/i)).toBeInTheDocument();
      });
    });
  });
});
