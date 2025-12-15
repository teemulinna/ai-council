import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '../../stores/canvasStore';
import { useRolesStore } from '../../stores/rolesStore';
import { usePatternsStore } from '../../stores/patternsStore';
import { AVAILABLE_MODELS, providerColors, getModelDisplayName } from '../../utils/helpers';
import { PRESETS } from '../../utils/presets';

// Tab configuration - history moved to right-side panel
const TABS = [
  { id: 'presets', icon: '📋', label: 'Presets', primary: true },
  { id: 'models', icon: '🤖', label: 'Models', primary: true },
  { id: 'settings', icon: '⚙️', label: 'Settings', primary: false },
];

export default function Sidebar({ onViewLogs }) {
  const [activeTab, setActiveTab] = useState('presets');
  const [settingsSubTab, setSettingsSubTab] = useState('patterns'); // 'patterns' or 'roles'
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', icon: '🎭', prompt: '' });
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);

  const loadPreset = useCanvasStore((s) => s.loadPreset);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const favouriteModels = useCanvasStore((s) => s.favouriteModels);
  const toggleFavourite = useCanvasStore((s) => s.toggleFavourite);


  const getAllRoles = useRolesStore((s) => s.getAllRoles);
  const addRole = useRolesStore((s) => s.addRole);
  const deleteRole = useRolesStore((s) => s.deleteRole);
  const allRoles = getAllRoles();

  const patterns = usePatternsStore((s) => s.patterns);
  const fetchPatterns = usePatternsStore((s) => s.fetchPatterns);
  const getGroupedPatterns = usePatternsStore((s) => s.getGroupedPatterns);

  // Fetch patterns on mount
  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Get favourite models as objects
  const favourites = AVAILABLE_MODELS.filter((m) => favouriteModels.includes(m.id));

  // Handle drag start for models
  const handleDragStart = (event, model) => {
    const nodeData = {
      model: model.id,
      displayName: getModelDisplayName(model.id),
      provider: model.provider,
      role: 'responder',
      systemPrompt: '',
      temperature: 0.7,
      isChairman: false,
    };
    event.dataTransfer.setData('application/json', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle preset selection
  const handlePresetSelect = (preset) => {
    // If canvas is empty, load directly without confirmation
    const currentNodes = useCanvasStore.getState().nodes;
    if (currentNodes.length === 0) {
      loadPreset(preset);
      return;
    }
    // Otherwise confirm before replacing
    if (window.confirm(`Load "${preset.name}" preset? This will replace your current canvas.`)) {
      loadPreset(preset);
    }
  };

  return (
    <div className="w-64 h-full bg-bg-secondary border-r border-white/10 flex flex-col">
      {/* Tabs - Cleaner with priority grouping */}
      <div className="flex border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-tour={`${tab.id}-tab`}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-text-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="ml-1">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {activeTab === 'models' && (
            <motion.div
              key="models"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2"
            >
              <p className="text-xs text-text-secondary mb-3">
                Drag models onto the canvas. Click ⭐ to add favourites.
              </p>

              {/* Favourites section */}
              {favourites.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-xs font-medium text-text-secondary">
                      Favourites
                    </span>
                  </div>
                  <div className="space-y-1">
                    {favourites.map((model) => (
                      <div
                        key={`fav-${model.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, model)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10
                                   hover:bg-yellow-500/20 cursor-grab active:cursor-grabbing
                                   transition-colors border border-yellow-500/20"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavourite(model.id); }}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          ★
                        </button>
                        <span className="text-sm flex-1">{model.name}</span>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: providerColors[model.provider] }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group by provider */}
              {['anthropic', 'openai', 'google', 'deepseek', 'meta'].map((provider) => {
                const models = AVAILABLE_MODELS.filter((m) => m.provider === provider);
                if (models.length === 0) return null;

                return (
                  <div key={provider} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: providerColors[provider] }}
                      />
                      <span className="text-xs font-medium text-text-secondary capitalize">
                        {provider === 'meta' ? 'Meta/NVIDIA' : provider}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {models.map((model) => {
                        const isFav = favouriteModels.includes(model.id);
                        return (
                          <div
                            key={model.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, model)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50
                                       hover:bg-bg-tertiary cursor-grab active:cursor-grabbing
                                       transition-colors border border-transparent hover:border-white/10 group"
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavourite(model.id); }}
                              className={`transition-colors ${isFav ? 'text-yellow-400' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-yellow-400'}`}
                            >
                              {isFav ? '★' : '☆'}
                            </button>
                            <span className="text-sm flex-1">{model.name}</span>
                            {model.tier === 'budget' && (
                              <span className="text-[10px] text-accent-success px-1.5 py-0.5 rounded bg-accent-success/10">
                                Budget
                              </span>
                            )}
                            {model.tier === 'premium' && (
                              <span className="text-[10px] text-accent-warning px-1.5 py-0.5 rounded bg-accent-warning/10">
                                Premium
                              </span>
                            )}
                            {model.tier === 'standard' && (
                              <span className="text-[10px] text-accent-primary px-1.5 py-0.5 rounded bg-accent-primary/10">
                                Standard
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'presets' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-2"
            >
              <p className="text-xs text-text-secondary mb-3">
                Click to load a preset configuration
              </p>

              <div data-tour="preset-list">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full text-left p-3 rounded-lg bg-bg-tertiary/50
                             hover:bg-bg-tertiary transition-colors
                             border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-sm font-medium text-text-primary">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>{preset.nodes.length} participants</span>
                    <span>~${preset.estimatedCost.toFixed(2)}</span>
                  </div>
                </button>
              ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3"
            >
              {/* Settings Sub-tabs */}
              <div className="flex gap-1 p-1 bg-bg-tertiary/50 rounded-lg mb-3">
                <button
                  onClick={() => setSettingsSubTab('patterns')}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                    settingsSubTab === 'patterns'
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  🧠 Patterns
                </button>
                <button
                  onClick={() => setSettingsSubTab('roles')}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                    settingsSubTab === 'roles'
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  🎭 Roles
                </button>
              </div>

              {/* Patterns Content */}
              {settingsSubTab === 'patterns' && (
                <>
                  <p className="text-xs text-text-secondary mb-3">
                    Reasoning patterns for AI thinking strategies
                  </p>

              {Object.entries(getGroupedPatterns()).map(([catId, category]) => (
                <div key={catId} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-text-secondary">
                      {category.name}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {category.description}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {category.patterns.map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => setSelectedPattern(pattern)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/pattern', JSON.stringify({
                            id: pattern.id,
                            name: pattern.name,
                            icon: pattern.icon,
                          }));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-bg-tertiary/50 border border-transparent
                                   hover:border-white/10 hover:bg-bg-tertiary cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{pattern.icon}</span>
                          <span className="text-sm font-medium text-text-primary">
                            {pattern.name}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mb-2">
                          {pattern.description}
                        </p>
                        {pattern.best_for && (
                          <div className="flex flex-wrap gap-1">
                            {pattern.best_for.slice(0, 2).map((use, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-secondary rounded"
                              >
                                {use}
                              </span>
                            ))}
                            {pattern.best_for.length > 2 && (
                              <span className="text-[9px] text-text-muted">
                                +{pattern.best_for.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {patterns.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <span className="text-3xl block mb-2">🧠</span>
                  <p className="text-sm">Loading patterns...</p>
                </div>
              )}

              {/* Pattern Details Modal */}
              {selectedPattern && (
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                  onClick={() => setSelectedPattern(null)}
                >
                  <div
                    className="bg-bg-secondary rounded-xl p-5 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{selectedPattern.icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary">
                            {selectedPattern.name}
                          </h3>
                          <span className="text-[10px] text-text-muted capitalize">
                            {selectedPattern.category} pattern
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPattern(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                   text-text-muted hover:text-text-primary hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Description</label>
                        <p className="text-sm text-text-primary mt-1">{selectedPattern.description}</p>
                      </div>

                      {selectedPattern.best_for && selectedPattern.best_for.length > 0 && (
                        <div>
                          <label className="text-xs font-medium text-text-secondary">Best For</label>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedPattern.best_for.map((use, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded-full"
                              >
                                {use}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPattern.prompt_prefix && (
                        <div>
                          <label className="text-xs font-medium text-text-secondary">Prompt Modifier</label>
                          <div className="mt-1 p-3 bg-bg-tertiary rounded-lg">
                            <p className="text-xs text-text-primary whitespace-pre-wrap italic">
                              "{selectedPattern.prompt_prefix}"
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-text-muted">
                          Apply this pattern to a council member by selecting them on the canvas
                          and choosing this pattern from the Reasoning Pattern dropdown.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPattern(null)}
                      className="w-full mt-4 py-2.5 bg-accent-primary text-white text-sm font-medium
                                 rounded-lg hover:bg-accent-primary/90 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
                </>
              )}

              {/* Roles Content */}
              {settingsSubTab === 'roles' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-text-secondary">
                      Available roles for council members
                    </p>
                    <button
                      onClick={() => setShowRoleModal(true)}
                      className="text-xs text-accent-primary hover:text-accent-primary/80"
                    >
                      + Add Role
                    </button>
                  </div>

                  {allRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className="w-full text-left p-3 rounded-lg bg-bg-tertiary/50 border border-transparent
                                 hover:border-white/10 hover:bg-bg-tertiary transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{role.icon}</span>
                        <span className="text-sm font-medium text-text-primary flex-1">
                          {role.name}
                        </span>
                        {!role.isBuiltIn && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete "${role.name}" role?`)) {
                                deleteRole(role.id);
                              }
                            }}
                            className="text-xs text-accent-error opacity-0 group-hover:opacity-100
                                       transition-opacity cursor-pointer hover:underline"
                          >
                            Delete
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary">{role.description}</p>
                      {role.isBuiltIn && (
                        <span className="text-[10px] text-text-muted mt-1 inline-block">
                          Built-in
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Add Role Modal */}
                  {showRoleModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-bg-secondary rounded-lg p-4 w-80 max-w-[90vw]">
                        <h3 className="text-sm font-semibold text-text-primary mb-4">
                          Create Custom Role
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-text-secondary">Icon</label>
                            <input
                              type="text"
                              value={newRole.icon}
                              onChange={(e) => setNewRole({ ...newRole, icon: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-bg-tertiary border border-white/10
                                         rounded-lg text-sm text-text-primary"
                              placeholder="🎭"
                              maxLength={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary">Name</label>
                            <input
                              type="text"
                              value={newRole.name}
                              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-bg-tertiary border border-white/10
                                         rounded-lg text-sm text-text-primary"
                              placeholder="Role name..."
                            />
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary">Description</label>
                            <input
                              type="text"
                              value={newRole.description}
                              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-bg-tertiary border border-white/10
                                         rounded-lg text-sm text-text-primary"
                              placeholder="What this role does..."
                            />
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary">System Prompt</label>
                            <textarea
                              value={newRole.prompt}
                              onChange={(e) => setNewRole({ ...newRole, prompt: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-bg-tertiary border border-white/10
                                         rounded-lg text-sm text-text-primary h-24 resize-none"
                              placeholder="Instructions for this role..."
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => {
                              setShowRoleModal(false);
                              setNewRole({ name: '', description: '', icon: '🎭', prompt: '' });
                            }}
                            className="flex-1 py-2 text-sm text-text-muted hover:text-text-primary
                                       transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (newRole.name && newRole.description) {
                                addRole(newRole);
                                setShowRoleModal(false);
                                setNewRole({ name: '', description: '', icon: '🎭', prompt: '' });
                              }
                            }}
                            className="flex-1 py-2 bg-accent-primary text-white text-sm
                                       rounded-lg hover:bg-accent-primary/90"
                          >
                            Create Role
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Role Details Modal */}
                  {selectedRole && (
                    <div
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                      onClick={() => setSelectedRole(null)}
                    >
                      <div
                        className="bg-bg-secondary rounded-xl p-5 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{selectedRole.icon}</span>
                            <div>
                              <h3 className="text-sm font-semibold text-text-primary">
                                {selectedRole.name}
                              </h3>
                              {selectedRole.isBuiltIn && (
                                <span className="text-[10px] text-text-muted">Built-in Role</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedRole(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg
                                       text-text-muted hover:text-text-primary hover:bg-white/10"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-medium text-text-secondary">Description</label>
                            <p className="text-sm text-text-primary mt-1">{selectedRole.description}</p>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-text-secondary">System Prompt</label>
                            <div className="mt-1 p-3 bg-bg-tertiary rounded-lg">
                              <p className="text-xs text-text-primary whitespace-pre-wrap">
                                {selectedRole.prompt || 'No specific prompt defined'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/10">
                            <p className="text-xs text-text-muted">
                              Assign this role to a council member by selecting them on the canvas
                              and choosing this role from the dropdown.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedRole(null)}
                          className="w-full mt-4 py-2.5 bg-accent-primary text-white text-sm font-medium
                                     rounded-lg hover:bg-accent-primary/90 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => {
            if (window.confirm('Clear canvas?')) clearCanvas();
          }}
          className="w-full py-2 text-sm text-text-muted hover:text-accent-error
                     transition-colors rounded-lg hover:bg-accent-error/10"
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
}
