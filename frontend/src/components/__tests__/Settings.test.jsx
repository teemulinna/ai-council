/**
 * Settings Component Tests
 * Tests for default council management and preferences
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

describe('Settings Component', () => {
  const mockPresets = [
    {
      id: 'balanced',
      name: 'Balanced Council',
      description: 'Well-rounded perspectives',
      icon: '⚖️',
      agent_count: 5,
      estimated_cost: 0.18
    },
    {
      id: 'creative_boost',
      name: 'Creative Boost',
      description: 'Enhanced creativity',
      icon: '💡',
      agent_count: 6,
      estimated_cost: 0.20
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
    localStorage.clear();
    api.api.listRoles.mockResolvedValue({ roles: mockRoles });
    api.api.listModels.mockResolvedValue(mockModels);
    api.api.listPresets.mockResolvedValue({ presets: mockPresets });
    api.api.composeFromPreset.mockResolvedValue(mockCouncil);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Modal Rendering', () => {
    it('should not render when closed', () => {
      render(<Settings isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should render when open', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should render with two tabs', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /default council/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /preferences/i })).toBeInTheDocument();
      });
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Settings isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close settings/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Settings isOpen={true} onClose={onClose} />);

      const overlay = document.querySelector('.settings-overlay');
      await user.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Default Council Tab', () => {
    it('should load presets on mount', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(api.api.listPresets).toHaveBeenCalled();
      });
    });

    it('should display council type selector', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/use a preset/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/custom council/i)).toBeInTheDocument();
      });
    });

    it('should have preset mode selected by default', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const presetRadio = screen.getByRole('radio', { name: /use a preset/i });
        expect(presetRadio).toBeChecked();
      });
    });

    it('should switch to custom mode when selected', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      const customRadio = screen.getByRole('radio', { name: /custom council/i });
      await user.click(customRadio);

      expect(customRadio).toBeChecked();
    });
  });

  describe('Preset Selection', () => {
    it('should display available presets', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });
    });

    it('should select Balanced as default', async () => {
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const balancedCard = screen.getByText('Balanced Council').closest('.preset-option');
        expect(balancedCard).toHaveClass('selected');
      });
    });

    it('should load preset council when selected', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-option');
      await user.click(creativeCard);

      await waitFor(() => {
        expect(api.api.composeFromPreset).toHaveBeenCalledWith('creative_boost');
      });
    });

    it('should show agent customization after preset selection', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-option');
      await user.click(creativeCard);

      await waitFor(() => {
        expect(screen.getByText(/customize "creative boost"/i)).toBeInTheDocument();
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to localStorage', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeTruthy();
        const settings = JSON.parse(saved);
        expect(settings.defaultCouncilType).toBe('preset');
      });
    });

    it('should load settings from localStorage', async () => {
      const savedSettings = {
        defaultCouncilType: 'custom',
        selectedPreset: null,
        customAgents: [],
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('ai-council-settings', JSON.stringify(savedSettings));

      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const customRadio = screen.getByRole('radio', { name: /custom council/i });
        expect(customRadio).toBeChecked();
      });
    });

    it('should dispatch settings-updated event on save', async () => {
      const user = userEvent.setup();
      const eventListener = vi.fn();
      window.addEventListener('settings-updated', eventListener);

      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
      });

      window.removeEventListener('settings-updated', eventListener);
    });

    it('should close modal after saving', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Settings isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Preferences Tab', () => {
    it('should switch to preferences tab', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      const preferencesTab = screen.getByRole('button', { name: /preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText('Application Preferences')).toBeInTheDocument();
      });
    });

    it('should show reset to defaults button', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      const preferencesTab = screen.getByRole('button', { name: /preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
      });
    });

    it('should reset settings when reset button clicked', async () => {
      const user = userEvent.setup();

      // Save some settings first
      localStorage.setItem('ai-council-settings', JSON.stringify({
        defaultCouncilType: 'custom',
        selectedPreset: null,
        customAgents: []
      }));

      // Mock window.confirm
      window.confirm = vi.fn(() => true);

      render(<Settings isOpen={true} onClose={vi.fn()} />);

      const preferencesTab = screen.getByRole('button', { name: /preferences/i });
      await user.click(preferencesTab);

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);

      await waitFor(() => {
        const saved = localStorage.getItem('ai-council-settings');
        expect(saved).toBeNull();
      });
    });
  });

  describe('Agent Customization', () => {
    it('should allow adding agents in preset mode', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-option');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(screen.getByText(/customize "balanced council"/i)).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /\+ add agent/i });
      await user.click(addButton);

      // Should increase agent count
      await waitFor(() => {
        expect(screen.getByText(/\(2\)/)).toBeInTheDocument(); // (2) agents now
      });
    });

    it('should allow removing agents', async () => {
      const user = userEvent.setup();
      render(<Settings isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Balanced Council')).toBeInTheDocument();
      });

      const balancedCard = screen.getByText('Balanced Council').closest('.preset-option');
      await user.click(balancedCard);

      await waitFor(() => {
        expect(screen.getByText(/customize "balanced council"/i)).toBeInTheDocument();
      });

      // Expand the first agent card to access the remove button
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await user.click(expandButtons[0]);

      // Wait for expanded section to render with remove button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove from council/i })).toBeInTheDocument();
      });

      // NOW click the remove button
      const removeButton = screen.getByRole('button', { name: /remove from council/i });
      await user.click(removeButton);

      // When all agents removed, customization section disappears (count > 0 check)
      await waitFor(() => {
        expect(screen.queryByText(/customize "balanced council"/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should not save when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Settings isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Creative Boost')).toBeInTheDocument();
      });

      const creativeCard = screen.getByText('Creative Boost').closest('.preset-option');
      await user.click(creativeCard);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
      const saved = localStorage.getItem('ai-council-settings');
      expect(saved).toBeNull();
    });
  });
});
