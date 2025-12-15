import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '../../stores/canvasStore';
import { useRolesStore } from '../../stores/rolesStore';
import { usePatternsStore } from '../../stores/patternsStore';
import {
  AVAILABLE_MODELS,
  providerColors,
  getProvider,
} from '../../utils/helpers';

export default function ConfigPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const selectNode = useCanvasStore((s) => s.selectNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const getAllRoles = useRolesStore((s) => s.getAllRoles);
  const AVAILABLE_ROLES = getAllRoles();

  const patterns = usePatternsStore((s) => s.patterns);
  const fetchPatterns = usePatternsStore((s) => s.fetchPatterns);
  const getGroupedPatterns = usePatternsStore((s) => s.getGroupedPatterns);

  const [localData, setLocalData] = useState(null);
  const [showPatternDetails, setShowPatternDetails] = useState(false);

  // Fetch patterns on mount
  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      setLocalData({ ...selectedNode.data });
    } else {
      setLocalData(null);
    }
  }, [selectedNode]);

  // Handle ESC key to close
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      selectNode(null);
    }
  }, [selectNode]);

  useEffect(() => {
    if (selectedNodeId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedNodeId, handleKeyDown]);

  // Handle field change
  const handleChange = (field, value) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle role change with auto-applying defaults
  const handleRoleChange = (roleId) => {
    const selectedRole = AVAILABLE_ROLES.find((r) => r.id === roleId);
    if (selectedRole) {
      setLocalData((prev) => ({
        ...prev,
        role: roleId,
        // Auto-apply role's default temperature if it exists
        temperature: selectedRole.temperature ?? prev.temperature,
        // Auto-apply role's default prompt only if current prompt is empty or matches previous role's default
        systemPrompt: prev.systemPrompt ? prev.systemPrompt : (selectedRole.prompt || ''),
      }));
    } else {
      setLocalData((prev) => ({ ...prev, role: roleId }));
    }
  };

  // Handle pattern change with auto-applying temperature
  const handlePatternChange = (patternId) => {
    const selectedPattern = patterns.find((p) => p.id === patternId);
    if (selectedPattern && selectedPattern.temperature !== undefined) {
      setLocalData((prev) => ({
        ...prev,
        reasoningPattern: patternId,
        temperature: selectedPattern.temperature,
      }));
    } else {
      setLocalData((prev) => ({ ...prev, reasoningPattern: patternId }));
    }
  };

  // Apply changes
  const handleApply = () => {
    if (selectedNodeId && localData) {
      updateNode(selectedNodeId, localData);
      selectNode(null); // Close after applying
    }
  };

  // Handle model change (also update provider)
  const handleModelChange = (modelId) => {
    const provider = getProvider(modelId);
    setLocalData((prev) => ({
      ...prev,
      model: modelId,
      provider,
    }));
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('Delete this participant?')) {
      removeNode(selectedNodeId);
    }
  };

  // Handle close
  const handleClose = () => {
    selectNode(null);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  if (!selectedNode || !localData) return null;

  const selectedRole = AVAILABLE_ROLES.find((r) => r.id === localData.role);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      />

      {/* Modal Panel - slides in from right */}
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-4 top-20 bottom-4 w-96 bg-bg-secondary border border-white/10
                   rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-bg-tertiary/30">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: providerColors[localData.provider] }}
            />
            <h2 className="text-sm font-semibold text-text-primary">
              Configure Participant
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={localData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg
                         text-sm text-text-primary placeholder-text-muted
                         focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="Enter name..."
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Model
            </label>
            <select
              value={localData.model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg
                         text-sm text-text-primary
                         focus:outline-none focus:border-accent-primary transition-colors"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: providerColors[localData.provider] }}
              />
              <span className="text-xs text-text-secondary capitalize">
                {localData.provider}
              </span>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Role
            </label>
            <select
              value={localData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg
                         text-sm text-text-primary
                         focus:outline-none focus:border-accent-primary transition-colors"
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.icon} {role.name}
                </option>
              ))}
            </select>
            {selectedRole && (
              <p className="text-xs text-text-secondary mt-2">
                {selectedRole.description}
              </p>
            )}
          </div>

          {/* Reasoning Pattern */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">
                Reasoning Pattern
              </label>
              <button
                onClick={() => setShowPatternDetails(!showPatternDetails)}
                className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                {showPatternDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>
            <select
              value={localData.reasoningPattern || 'standard'}
              onChange={(e) => handlePatternChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg
                         text-sm text-text-primary
                         focus:outline-none focus:border-accent-primary transition-colors"
            >
              {Object.entries(getGroupedPatterns()).map(([catId, category]) => (
                <optgroup key={catId} label={category.name}>
                  {category.patterns.map((pattern) => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.icon} {pattern.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {(() => {
              const selectedPattern = patterns.find(p => p.id === (localData.reasoningPattern || 'standard'));
              return selectedPattern && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-text-secondary">
                    {selectedPattern.description}
                  </p>
                  {showPatternDetails && (
                    <div className="bg-bg-tertiary/50 rounded-lg p-3 space-y-2">
                      {selectedPattern.best_for && (
                        <div>
                          <span className="text-xs font-medium text-text-secondary">Best for:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedPattern.best_for.map((use, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 bg-accent-primary/20 text-accent-primary rounded-full"
                              >
                                {use}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedPattern.prompt_prefix && (
                        <div>
                          <span className="text-xs font-medium text-text-secondary">Prompt modifier:</span>
                          <p className="text-[11px] text-text-secondary mt-1 italic">
                            "{selectedPattern.prompt_prefix.slice(0, 100)}..."
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              System Prompt
            </label>
            <textarea
              value={localData.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg
                         text-sm text-text-primary placeholder-text-muted resize-none
                         focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="Custom instructions for this participant..."
            />
            <p className="text-xs text-text-secondary mt-1">
              Leave empty to use role default
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Temperature: {localData.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localData.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full accent-accent-primary"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Speaking Order & Chairman in a row */}
          <div className="flex items-center gap-4">
            {/* Speaking Order */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Speaking Order
              </label>
              <input
                type="number"
                min="1"
                value={localData.speakingOrder}
                onChange={(e) => handleChange('speakingOrder', parseInt(e.target.value, 10))}
                className="w-20 px-3 py-2 bg-bg-tertiary border border-white/10 rounded-lg
                           text-sm text-text-primary text-center
                           focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            {/* Chairman toggle */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm text-text-primary">Chairman</span>
                <p className="text-[10px] text-text-secondary">Final answer</p>
              </div>
              <button
                onClick={() => handleChange('isChairman', !localData.isChairman)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  localData.isChairman ? 'bg-accent-primary' : 'bg-bg-tertiary border border-white/10'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    localData.isChairman ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 bg-bg-tertiary/30 flex gap-2">
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 text-accent-error text-sm
                       rounded-lg hover:bg-accent-error/10 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 text-text-secondary text-sm
                       rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 bg-accent-primary text-white text-sm font-medium
                       rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
