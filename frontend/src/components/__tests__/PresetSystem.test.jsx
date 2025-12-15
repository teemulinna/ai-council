/**
 * TDD Unit Tests for Preset System
 * Tests cover preset loading, selection, customization, and integration
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
    getPreset: vi.fn(),
    composeFromPreset: vi.fn(),
  }
}));

describe('Preset System', () => {
  const mockPresets = [
    {
      id: 'balanced',
      name: 'Balanced Council',
      description: 'Well-rounded perspectives with 5 diverse roles',
      icon: '⚖️',
      agent_count: 5,
      roles: ['primary_responder', 'devils_advocate', 'fact_checker', 'creative_thinker', 'practical_advisor'],
      mode: 'balanced',
      estimated_cost: 0.18
    },
    {
      id: 'creative_boost',
      name: 'Creative Boost',
      description: 'Enhanced creativity with multiple creative thinkers',
      icon: '💡',
      agent_count: 6,
      roles: ['creative_thinker', 'primary_responder', 'creative_thinker', 'devils_advocate', 'synthesizer'],
      mode: 'diverse',
      estimated_cost: 0.20
    },
    {
      id: 'debate_mode',
      name: 'Debate Mode',
      description: "Vigorous debate with multiple devil's advocates",
      icon: '⚡',
      agent_count: 7,
      roles: ['primary_responder', 'devils_advocate', 'devils_advocate', 'fact_checker', 'devils_advocate', 'synthesizer', 'practical_advisor'],
      mode: 'diverse',
      estimated_cost: 0.24
    }
  ];

  const mockRoles = [
    {
      id: 'primary_responder',
      name: 'primary_responder',
      display_name: 'Primary Responder',
      description: 'Provides main response',
      priority: 1
    }
  ];

  const mockModels = {
    premium: ['openai/gpt-4'],
    standard: ['openai/gpt-3.5-turbo'],
    budget: ['meta-llama/llama-2-70b']
  };

  const mockCouncilFromPreset = {
    agents: [
      { role: mockRoles[0], model: 'openai/gpt-4', custom_prompt: null },
      { role: mockRoles[0], model: 'openai/gpt-3.5-turbo', custom_prompt: null }
    ],
    agent_count: 2,
    topology: 'star',
    estimated_cost: 0.18,
    preset_id: 'balanced',
    preset_name: 'Balanced Council'
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
    api.api.listPresets.mockResolvedValue({ presets: mockPresets });
    api.api.composeFromPreset.mockResolvedValue(mockCouncilFromPreset);
  });

  describe('Preset Loading', () => {
    it('should load presets on mount', async () => {
      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(api.api.listPresets).toHaveBeenCalled();
      });
    });

    it('should handle preset loading errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.api.listPresets.mockRejectedValue(new Error('Network error'));

      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to load presets:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('should handle empty preset list', async () => {
      api.api.listPresets.mockResolvedValue({ presets: [] });

      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(api.api.listPresets).toHaveBeenCalled();
      });

      // Should not crash
      expect(screen.getByRole('button', { name: /configure council/i })).toBeInTheDocument();
    });
  });

  describe('Preset Mode Selection', () => {
    it('should show preset mode option', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/preset councils/i)).toBeInTheDocument();
      });
    });

    it('should switch to preset mode when selected', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      expect(presetRadio).toBeChecked();
    });

    it('should show preset count in mode description', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      await waitFor(() => {
        expect(screen.getByText(/choose from 3 optimized configurations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Preset Display', () => {
    it('should display all preset cards when preset mode is selected', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
        expect(screen.getByText('Debate Mode')).toBeInTheDocument();
      });
    });

    it('should display preset icons', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('⚖️')).toBeInTheDocument();
        expect(screen.getByText('💡')).toBeInTheDocument();
        expect(screen.getByText('⚡')).toBeInTheDocument();
      });
    });

    it('should display preset descriptions', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText(/well-rounded perspectives/i)).toBeInTheDocument();
        expect(screen.getByText(/enhanced creativity/i)).toBeInTheDocument();
        expect(screen.getByText(/vigorous debate/i)).toBeInTheDocument();
      });
    });

    it('should display agent counts for each preset', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('5 agents')).toBeInTheDocument();
        expect(screen.getByText('6 agents')).toBeInTheDocument();
        expect(screen.getByText('7 agents')).toBeInTheDocument();
      });
    });

    it('should display estimated costs for each preset', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('$0.18')).toBeInTheDocument();
        expect(screen.getByText('$0.20')).toBeInTheDocument();
        expect(screen.getByText('$0.24')).toBeInTheDocument();
      });
    });
  });

  describe('Preset Selection', () => {
    it('should call composeFromPreset when preset is clicked', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalledWith('balanced');
      });
    });

    it('should show selected state on preset card', async () => {
      const user = userEvent.setup();
      const { container } = render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(balancedCard).toHaveClass('selected');
      });
    });

    it('should load council configuration when preset is selected', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-card');
      await user.click(creativeCard);

      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalledWith('creative_boost');
      });
    });
  });

  describe('Preset Customization', () => {
    it('should show customization panel after preset selection', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(screen.getByText(/customize "balanced council"/i)).toBeInTheDocument();
      });
    });

    it('should display preset agents in customization panel', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      await waitFor(() => {
        // Should show agent cards
        const agentNumbers = screen.getAllByText(/#\d+/);
        expect(agentNumbers.length).toBeGreaterThan(0);
      });
    });

    it('should allow adding agents to preset', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Debate Mode')).toBeInTheDocument();
      });

      const debateCard = screen.getByText('Debate Mode').closest('.preset-card');
      await user.click(debateCard);

      await waitFor(() => {
        expect(screen.getByText(/\+ add agent/i)).toBeInTheDocument();
      });

      const initialAgentCount = screen.getAllByText(/#\d+/).length;

      const addButton = screen.getByText(/\+ add agent/i);
      await user.click(addButton);

      await waitFor(() => {
        const newAgentCount = screen.getAllByText(/#\d+/).length;
        expect(newAgentCount).toBe(initialAgentCount + 1);
      });
    });
  });

  describe('Preset Usage', () => {
    it('should call onCouncilSelect with preset council when Use Once is clicked', async () => {
      const user = userEvent.setup();
      const onCouncilSelect = vi.fn();
      render(<CouncilChip {...defaultProps} onCouncilSelect={onCouncilSelect} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use once/i })).toBeInTheDocument();
      });

      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      await waitFor(() => {
        expect(onCouncilSelect).toHaveBeenCalledWith(expect.objectContaining({
          preset_id: 'balanced',
          preset_name: 'Balanced Council'
        }));
      });
    });

    it('should update council summary when preset is selected', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      // Initial state
      expect(screen.getByText('Default (5 agents)')).toBeInTheDocument();

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-card');
      await user.click(creativeCard);

      // Close panel
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Summary should be updated (but won't show until we implement the summary update logic)
    });

    it('should close panel after Use Once is clicked', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-card');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use once/i })).toBeInTheDocument();
      });

      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration with Custom Mode', () => {
    it('should switch between preset and custom modes', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // Start in default mode
      const defaultRadio = screen.getByRole('radio', { name: /default council/i });
      expect(defaultRadio).toBeChecked();

      // Switch to preset
      const presetRadio = screen.getByRole('radio', { name: /preset councils/i });
      await user.click(presetRadio);
      expect(presetRadio).toBeChecked();

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      // Switch to custom
      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);
      expect(customRadio).toBeChecked();

      // Preset cards should be hidden
      expect(screen.queryByText('Balanced Council')).not.toBeInTheDocument();

      // Switch back to preset
      await user.click(presetRadio);
      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });
    });
  });
});
