/**
 * TDD Unit Tests for AgentCard Component
 * Tests cover rendering, expansion, model selection, prompt editing, and interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentCard from '../AgentCard';

describe('AgentCard Component', () => {
  const mockAgent = {
    role: {
      id: 'primary_responder',
      display_name: 'Primary Responder',
      description: 'Provides main response to the query',
      prompt_modifier: 'You are the primary responder.'
    },
    model: 'openai/gpt-4',
    custom_prompt: null,
    capabilities: {
      reasoning: 0.85,
      creativity: 0.70,
      accuracy: 0.90
    }
  };

  const mockAvailableModels = {
    premium: ['openai/gpt-4', 'anthropic/claude-3-opus'],
    standard: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-sonnet'],
    budget: ['meta-llama/llama-2-70b']
  };

  const defaultProps = {
    agent: mockAgent,
    index: 0,
    availableModels: mockAvailableModels,
    onModelChange: vi.fn(),
    onPromptChange: vi.fn(),
    onRemove: vi.fn(),
    isExpanded: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render agent card with header', async () => {
      render(<AgentCard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('Primary Responder')).toBeInTheDocument();
        expect(screen.getByText('gpt-4')).toBeInTheDocument();
        expect(screen.getByText('premium')).toBeInTheDocument();
      });
    });

    it('should render collapsed by default', () => {
      render(<AgentCard {...defaultProps} />);

      expect(screen.queryByText('AI Model')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom Instructions')).not.toBeInTheDocument();
    });

    it('should render expanded when isExpanded is true', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('AI Model')).toBeInTheDocument();
      expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
    });

    it('should display correct agent number', () => {
      const { rerender } = render(<AgentCard {...defaultProps} index={0} />);
      expect(screen.getByText('#1')).toBeInTheDocument();

      rerender(<AgentCard {...defaultProps} index={4} />);
      expect(screen.getByText('#5')).toBeInTheDocument();
    });

    it('should show model tier badge with correct color', () => {
      render(<AgentCard {...defaultProps} />);

      const tierBadge = screen.getByText('premium');
      expect(tierBadge).toHaveClass('agent-card__tier--premium');
    });
  });

  describe('Expansion Behavior', () => {
    it('should toggle expansion when header is clicked', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} />);

      const header = screen.getByRole('button', { name: /expand/i });

      // Initially collapsed
      expect(screen.queryByText('AI Model')).not.toBeInTheDocument();

      // Click to expand
      await user.click(header);
      expect(screen.getByText('AI Model')).toBeInTheDocument();

      // Click to collapse
      await user.click(header);
      await waitFor(() => {
        expect(screen.queryByText('AI Model')).not.toBeInTheDocument();
      });
    });

    it('should show chevron icon that rotates on expansion', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} />);

      const chevron = screen.getByText('▾');
      expect(chevron).toHaveClass('chevron', 'down');

      const header = screen.getByRole('button', { name: /expand/i });
      await user.click(header);

      expect(chevron).toHaveClass('chevron', 'up');
    });
  });

  describe('Model Selection', () => {
    it('should render model dropdown when expanded', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const selects = screen.getAllByRole('combobox');
      const modelSelect = selects[0]; // First select is for model
      expect(modelSelect).toBeInTheDocument();
      expect(modelSelect).toHaveValue('openai/gpt-4');
    });

    it('should group models by tier in dropdown', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const selects = screen.getAllByRole('combobox');
      const modelSelect = selects[0]; // First select is for model
      expect(within(modelSelect).getByRole('group', { name: 'Premium ($$$)' })).toBeInTheDocument();
      expect(within(modelSelect).getByRole('group', { name: 'Standard ($$)' })).toBeInTheDocument();
      expect(within(modelSelect).getByRole('group', { name: 'Budget ($)' })).toBeInTheDocument();
    });

    it('should call onModelChange when model is selected', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const selects = screen.getAllByRole('combobox');
      const modelSelect = selects[0]; // First select is for model
      await user.selectOptions(modelSelect, 'anthropic/claude-3-opus');

      expect(defaultProps.onModelChange).toHaveBeenCalledWith(0, 'anthropic/claude-3-opus');
    });

    it('should display all available models in correct tiers', async () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const selects = screen.getAllByRole('combobox');
      const modelSelect = selects[0]; // First select is for model
      const options = within(modelSelect).getAllByRole('option');
      const optionTexts = options.map(opt => opt.textContent);

      await waitFor(() => {
        // Premium models
        expect(optionTexts).toContain('gpt-4');
        expect(optionTexts).toContain('claude-3-opus');

        // Standard models
        expect(optionTexts).toContain('gpt-3.5-turbo');
        expect(optionTexts).toContain('claude-3-sonnet');

        // Budget models
        expect(optionTexts).toContain('llama-2-70b');
      });
    });
  });

  describe('Role Information', () => {
    it('should display role name and description when expanded', async () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      await waitFor(() => {
        expect(screen.getByText('Primary Responder')).toBeInTheDocument();
        expect(screen.getByText('Provides main response to the query')).toBeInTheDocument();
      });
    });

    it('should show role section with icon', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('🎭')).toBeInTheDocument();
    });
  });

  describe('Prompt Customization', () => {
    it('should show prompt preview by default', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('You are the primary responder.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit instructions/i })).toBeInTheDocument();
    });

    it('should show custom prompt if provided', async () => {
      const agentWithCustomPrompt = {
        ...mockAgent,
        custom_prompt: 'Custom instructions here'
      };

      render(<AgentCard {...defaultProps} agent={agentWithCustomPrompt} isExpanded={true} />);

      await waitFor(() => {
        expect(screen.getByText('Custom instructions here')).toBeInTheDocument();
      });
    });

    it('should switch to edit mode when Edit Instructions is clicked', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const editButton = screen.getByRole('button', { name: /edit instructions/i });
      await user.click(editButton);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter custom instructions/i)).toBeInTheDocument();
    });

    it('should call onPromptChange when prompt is edited', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const editButton = screen.getByRole('button', { name: /edit instructions/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'New custom prompt');

      expect(defaultProps.onPromptChange).toHaveBeenCalled();
    });

    it('should show Save and Cancel buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const editButton = screen.getByRole('button', { name: /edit instructions/i });
      await user.click(editButton);

      expect(screen.getByRole('button', { name: /save instructions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should exit edit mode when Save is clicked', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const editButton = screen.getByRole('button', { name: /edit instructions/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save instructions/i });
      await user.click(saveButton);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit instructions/i })).toBeInTheDocument();
    });

    it('should exit edit mode when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const editButton = screen.getByRole('button', { name: /edit instructions/i });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Capabilities Display', () => {
    it('should show all capability bars when expanded', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Reasoning')).toBeInTheDocument();
      expect(screen.getByText('Creativity')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
    });

    it('should display correct capability percentages', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('85%')).toBeInTheDocument(); // reasoning
      expect(screen.getByText('70%')).toBeInTheDocument(); // creativity
      expect(screen.getByText('90%')).toBeInTheDocument(); // accuracy
    });

    it('should render capability bars with correct widths', () => {
      const { container } = render(<AgentCard {...defaultProps} isExpanded={true} />);

      const reasoningBar = container.querySelector('.capability__fill');
      expect(reasoningBar).toHaveStyle({ width: '85%' });
    });
  });

  describe('Remove Agent', () => {
    it('should show Remove from Council button when expanded', () => {
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Remove from Council')).toBeInTheDocument();
    });

    it('should call onRemove with correct index when clicked', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} isExpanded={true} />);

      const removeButton = screen.getByText('Remove from Council');
      await user.click(removeButton);

      expect(defaultProps.onRemove).toHaveBeenCalledWith(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AgentCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<AgentCard {...defaultProps} />);

      const header = screen.getByRole('button', { name: /expand/i });

      await user.tab();
      expect(header).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('AI Model')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle agent without role gracefully', async () => {
      const agentNoRole = {
        ...mockAgent,
        role: null
      };

      render(<AgentCard {...defaultProps} agent={agentNoRole} isExpanded={true} />);
      await waitFor(() => {
        // Agent still has model 'openai/gpt-4', so should display 'gpt-4' in header
        const modelName = screen.getAllByText('gpt-4')[0]; // First occurrence in header
        expect(modelName).toBeInTheDocument();
        expect(modelName).toHaveClass('agent-card__model-name');
      });
    });

    it('should handle agent without model gracefully', () => {
      const agentNoModel = {
        ...mockAgent,
        model: null
      };

      render(<AgentCard {...defaultProps} agent={agentNoModel} />);
      expect(screen.getByText('Select model')).toBeInTheDocument();
    });

    it('should handle empty availableModels', () => {
      render(<AgentCard {...defaultProps} availableModels={{}} isExpanded={true} />);

      const selects = screen.getAllByRole('combobox');
      const modelSelect = selects[0]; // First select is for model
      const options = within(modelSelect).getAllByRole('option');
      expect(options.length).toBe(1); // Only "Choose model..." option
    });

    it('should handle missing capabilities', () => {
      const agentNoCapabilities = {
        ...mockAgent,
        capabilities: null
      };

      render(<AgentCard {...defaultProps} agent={agentNoCapabilities} isExpanded={true} />);
      expect(screen.queryByText('Capabilities')).not.toBeInTheDocument();
    });
  });
});
