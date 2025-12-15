/**
 * TDD Unit Tests for CouncilChip Component
 * Tests cover inline expansion, mode selection, agent management, and council composition
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CouncilChip from '../CouncilChip';
import * as api from '../../api';

// Mock the API module
vi.mock('../../api', () => ({
  api: {
    listRoles: vi.fn(),
    listModels: vi.fn(),
    composeCouncil: vi.fn(),
    listPresets: vi.fn(),
    composeFromPreset: vi.fn(),
    getPreset: vi.fn()
  }
}));

describe('CouncilChip Component', () => {
  const mockRoles = [
    {
      id: 'primary_responder',
      display_name: 'Primary Responder',
      description: 'Provides main response',
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
    }
  ];

  const mockModels = {
    premium: ['openai/gpt-4'],
    standard: ['openai/gpt-3.5-turbo'],
    budget: ['meta-llama/llama-2-70b']
  };

  const mockPresets = [
    { id: 'creative', name: 'Creative Team', agent_count: 4 },
    { id: 'analytical', name: 'Analytical Team', agent_count: 5 }
  ];

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
  });

  describe('Rendering - Collapsed State', () => {
    it('should render chip button in collapsed state', () => {
      render(<CouncilChip {...defaultProps} />);

      expect(screen.getByRole('button', { name: /configure council/i })).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should show council summary in collapsed state', () => {
      render(<CouncilChip {...defaultProps} />);

      expect(screen.getByText('Council:')).toBeInTheDocument();
      expect(screen.getByText('Default (5 agents)')).toBeInTheDocument();
    });

    it('should hide council text in compact mode', () => {
      render(<CouncilChip {...defaultProps} compact={true} />);

      expect(screen.queryByText('Council:')).not.toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should show chevron icon pointing down when collapsed', () => {
      render(<CouncilChip {...defaultProps} />);

      const chevron = screen.getByText('▾');
      expect(chevron).toHaveClass('council-chip__chevron', 'down');
    });

    it('should not show panel when collapsed', () => {
      render(<CouncilChip {...defaultProps} />);

      expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
    });
  });

  describe('Expansion Behavior', () => {
    it('should expand panel when chip button is clicked', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      expect(screen.getByText('Council Settings')).toBeInTheDocument();
    });

    it('should rotate chevron up when expanded', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const chevron = screen.getByText('▾');
      expect(chevron).toHaveClass('council-chip__chevron', 'up');
    });

    it('should close panel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });

    it('should close panel when clicking outside', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <CouncilChip {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      expect(screen.getByText('Council Settings')).toBeInTheDocument();

      const outside = screen.getByTestId('outside');
      await user.click(outside);

      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mode Selection', () => {
    it('should show default and custom mode options when expanded', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      expect(screen.getByLabelText(/default council/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom council/i)).toBeInTheDocument();
    });

    it('should default to default mode', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const defaultRadio = screen.getByRole('radio', { name: /default council/i });
      expect(defaultRadio).toBeChecked();
    });

    it('should switch to custom mode when selected', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      expect(customRadio).toBeChecked();
    });

    it('should show agent configuration section in custom mode', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });
    });

    it('should hide agent configuration in default mode', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/configure agents/i)).toBeInTheDocument();
      });

      const defaultRadio = screen.getByRole('radio', { name: /default council/i });
      await user.click(defaultRadio);

      expect(screen.queryByText(/configure agents/i)).not.toBeInTheDocument();
    });
  });

  describe('Agent Management', () => {
    it('should load initial agents from API', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(api.api.listRoles).toHaveBeenCalled();
      });
    });

    it('should show Add Agent button in custom mode', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/\+ add agent/i)).toBeInTheDocument();
      });
    });

    it('should display agent count in header', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        expect(screen.getByText(/configure agents \(\d+\)/i)).toBeInTheDocument();
      });
    });

    it('should render AgentCard components for each agent', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        // Should have multiple agent cards
        const agentNumbers = screen.getAllByText(/#\d+/);
        expect(agentNumbers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Actions', () => {
    it('should show Cancel, Use Once, and Save as Default buttons', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use once/i })).toBeInTheDocument();
    });

    it('should show Save as Default only in custom mode', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      // Not shown in default mode
      expect(screen.queryByRole('button', { name: /save as default/i })).not.toBeInTheDocument();

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      // Shown in custom mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save as default/i })).toBeInTheDocument();
      });
    });

    it('should call onCouncilSelect when Use Once is clicked in default mode', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      expect(defaultProps.onCouncilSelect).toHaveBeenCalledWith(null);
    });

    it('should close panel after Use Once is clicked', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const useOnceButton = screen.getByRole('button', { name: /use once/i });
      await user.click(useOnceButton);

      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });

    it('should close panel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Council Settings')).not.toBeInTheDocument();
      });
    });

    it('should disable Use Once when no agents in custom mode', async () => {
      const user = userEvent.setup();
      // Mock empty roles to simulate no agents
      api.api.listRoles.mockResolvedValue({ roles: [] });

      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      await waitFor(() => {
        const useOnceButton = screen.getByRole('button', { name: /use once/i });
        expect(useOnceButton).toBeDisabled();
      });
    });
  });

  describe('Default Council', () => {
    it('should display default council info when provided', () => {
      const defaultCouncil = {
        agents: mockRoles.map(role => ({ role, model: null })),
        agent_count: 3
      };

      render(<CouncilChip {...defaultProps} defaultCouncil={defaultCouncil} />);

      expect(screen.getByText('Default (3 agents)')).toBeInTheDocument();
    });

    it('should update when defaultCouncil prop changes', () => {
      const { rerender } = render(<CouncilChip {...defaultProps} />);

      expect(screen.getByText('Default (5 agents)')).toBeInTheDocument();

      const newCouncil = {
        agents: mockRoles.slice(0, 2).map(role => ({ role, model: null })),
        agent_count: 2
      };

      rerender(<CouncilChip {...defaultProps} defaultCouncil={newCouncil} />);

      expect(screen.getByText('Default (2 agents)')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should load roles on mount', async () => {
      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(api.api.listRoles).toHaveBeenCalled();
      });
    });

    it('should load models on mount', async () => {
      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(api.api.listModels).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.api.listRoles.mockRejectedValue(new Error('API Error'));

      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to load roles:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      expect(chipButton).toHaveAttribute('aria-label', 'Configure council');
      expect(chipButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when panel is opened', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      expect(chipButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });

      await user.tab();
      expect(chipButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('Council Settings')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onCouncilSelect prop', async () => {
      const user = userEvent.setup();
      render(<CouncilChip {...defaultProps} onCouncilSelect={null} />);

      const chipButton = screen.getByRole('button', { name: /configure council/i });
      await user.click(chipButton);

      const useOnceButton = screen.getByRole('button', { name: /use once/i });

      // Should not throw error
      await user.click(useOnceButton);
    });

    it('should handle empty models response', async () => {
      api.api.listModels.mockResolvedValue({});

      render(<CouncilChip {...defaultProps} />);

      await waitFor(() => {
        expect(api.api.listModels).toHaveBeenCalled();
      });

      // Should not crash
      expect(screen.getByRole('button', { name: /configure council/i })).toBeInTheDocument();
    });
  });
});
