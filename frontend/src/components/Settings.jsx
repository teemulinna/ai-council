/**
 * Settings - Simplified single-page settings modal
 * Focus on preset selection and basic preferences
 */

import { useState, useEffect } from 'react';
import { api } from '../api';
import './Settings.css';

export default function Settings({ isOpen, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [showIndividual, setShowIndividual] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [availablePresets, setAvailablePresets] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadPresets();
    }
  }, [isOpen]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('ai-council-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setSelectedPreset(settings.selectedPreset || 'balanced');
        setShowIndividual(settings.showIndividual || false);
        setShowCosts(settings.showCosts || false);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const data = await api.listPresets();
      setAvailablePresets(data.presets || []);
    } catch (error) {
      console.error('Failed to load presets:', error);
      // Fallback presets
      setAvailablePresets([
        { id: 'fast', name: 'Fast', agent_count: 3, description: 'Quick responses with fewer models' },
        { id: 'balanced', name: 'Balanced', agent_count: 5, description: 'Good balance of speed and quality' },
        { id: 'deep', name: 'Deep', agent_count: 7, description: 'Thorough analysis with more models' },
      ]);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      const settings = {
        selectedPreset,
        showIndividual,
        showCosts,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('ai-council-settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('ai-council-settings');
      setSelectedPreset('balanced');
      setShowIndividual(false);
      setShowCosts(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2>Settings</h2>
          <button
            className="settings-close btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Default Council */}
          <section className="settings-section">
            <h3>Default Council</h3>
            <p className="settings-description">
              Choose the default number of models to consult
            </p>

            <div className="preset-options">
              {availablePresets.map((preset) => (
                <label
                  key={preset.id}
                  className={`preset-option ${selectedPreset === preset.id ? 'preset-option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={preset.id}
                    checked={selectedPreset === preset.id}
                    onChange={() => setSelectedPreset(preset.id)}
                  />
                  <div className="preset-option-content">
                    <span className="preset-name">{preset.name}</span>
                    <span className="preset-count">{preset.agent_count} models</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Display Preferences */}
          <section className="settings-section">
            <h3>Display</h3>

            <label className="toggle-option">
              <span className="toggle-label">Show individual responses by default</span>
              <input
                type="checkbox"
                checked={showIndividual}
                onChange={(e) => setShowIndividual(e.target.checked)}
              />
              <span className="toggle-switch" />
            </label>

            <label className="toggle-option">
              <span className="toggle-label">Show cost estimates</span>
              <input
                type="checkbox"
                checked={showCosts}
                onChange={(e) => setShowCosts(e.target.checked)}
              />
              <span className="toggle-switch" />
            </label>
          </section>

          {/* Reset */}
          <section className="settings-section settings-section--danger">
            <button
              className="reset-btn"
              onClick={handleReset}
            >
              Reset to defaults
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
