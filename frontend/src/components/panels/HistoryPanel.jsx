import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistoryStore } from '../../stores/historyStore';
import { formatCost, formatTokens } from '../../utils/helpers';
import ActivityHeatmap from './ActivityHeatmap';
import WeeklyView from './WeeklyView';

// View tabs configuration
const VIEW_TABS = [
  { id: 'list', icon: '📋', label: 'List' },
  { id: 'weekly', icon: '📅', label: 'Weekly' },
  { id: 'activity', icon: '📊', label: 'Activity' },
];

/**
 * HistoryPanel - Right-side collapsible panel for conversation history
 * Supports multiple views: List, Weekly grouped, and Activity heatmap
 */
export default function HistoryPanel({ isOpen, onClose, onViewLogs, onReplay }) {
  const conversations = useHistoryStore((s) => s.conversations);
  const deleteConversation = useHistoryStore((s) => s.deleteConversation);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [expandedId, setExpandedId] = useState(null);
  const [activeView, setActiveView] = useState('list');

  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 hour ago
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    // Less than 24 hours ago
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    // Same year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <AnimatePresence>
      {/* Backdrop - subtle, allows clicking through to canvas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* Panel - slides in from right */}
      <motion.div
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-14 bottom-0 w-96 bg-bg-secondary/95 backdrop-blur-lg
                   border-l border-white/10 shadow-2xl flex flex-col z-40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <h2 className="text-sm font-semibold text-text-primary">History</h2>
            {conversations.length > 0 && (
              <span className="text-xs text-text-muted bg-white/10 px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {conversations.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all history? This cannot be undone.')) {
                    clearHistory();
                  }
                }}
                className="p-2 text-xs text-text-muted hover:text-accent-error
                           hover:bg-accent-error/10 rounded-lg transition-colors"
                title="Clear all history"
              >
                🗑️
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary
                         hover:bg-white/10 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 p-2 border-b border-white/10">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs
                         font-medium rounded-lg transition-colors ${
                           activeView === tab.id
                             ? 'bg-accent-primary/20 text-accent-primary'
                             : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                         }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Activity Heatmap View */}
            {activeView === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4"
              >
                <ActivityHeatmap conversations={conversations} />
              </motion.div>
            )}

            {/* Weekly View */}
            {activeView === 'weekly' && (
              <motion.div
                key="weekly"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-3"
              >
                <WeeklyView
                  conversations={conversations}
                  onReplay={(conv) => {
                    onReplay(conv);
                    onClose();
                  }}
                  onViewLogs={onViewLogs}
                />
              </motion.div>
            )}

            {/* List View (default) */}
            {activeView === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <span className="text-4xl mb-4 opacity-50">📜</span>
                    <h3 className="text-sm font-medium text-text-secondary mb-2">
                      No conversations yet
                    </h3>
                    <p className="text-xs text-text-muted">
                      Run your council to start building history
                    </p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {conversations.map((conv) => (
                      <motion.div
                        key={conv.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-bg-tertiary/50 rounded-xl border border-white/5
                                   hover:border-white/10 transition-colors overflow-hidden"
                      >
                        {/* Main row - always visible */}
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm text-text-primary line-clamp-2 flex-1">
                              {conv.query}
                            </p>
                            <span className="text-[10px] text-text-muted whitespace-nowrap">
                              {formatDate(conv.timestamp)}
                            </span>
                          </div>

                          {/* Quick stats */}
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            {conv.tokens && (
                              <span className="flex items-center gap-1">
                                <span className="opacity-60">🔤</span> {formatTokens(conv.tokens)}
                              </span>
                            )}
                            {conv.cost && (
                              <span className="flex items-center gap-1">
                                <span className="opacity-60">💰</span> {formatCost(conv.cost)}
                              </span>
                            )}
                            {conv.config?.nodes && (
                              <span className="flex items-center gap-1">
                                <span className="opacity-60">👥</span> {conv.config.nodes.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {expandedId === conv.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-white/5"
                            >
                              {/* Preview of answer */}
                              {conv.finalAnswer?.content && (
                                <div className="p-3 bg-bg-tertiary/30">
                                  <p className="text-xs text-text-secondary line-clamp-4">
                                    {conv.finalAnswer.content}
                                  </p>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 p-2 bg-bg-primary/30">
                                {onReplay && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReplay(conv);
                                      onClose();
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2
                                               text-xs text-accent-primary hover:bg-accent-primary/10
                                               rounded-lg transition-colors"
                                  >
                                    <span>🔄</span> Replay
                                  </button>
                                )}
                                {onViewLogs && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewLogs(conv.id);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2
                                               text-xs text-text-secondary hover:bg-white/5
                                               rounded-lg transition-colors"
                                  >
                                    <span>📋</span> Logs
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this conversation?')) {
                                      deleteConversation(conv.id);
                                      setExpandedId(null);
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2
                                             text-xs text-accent-error/70 hover:text-accent-error
                                             hover:bg-accent-error/10 rounded-lg transition-colors"
                                >
                                  <span>🗑️</span> Delete
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-white/5 text-center">
          <p className="text-[10px] text-text-muted">
            {activeView === 'activity'
              ? 'Hover cells to see details • Green = more activity'
              : activeView === 'weekly'
              ? 'Click a week to expand conversations'
              : 'Click a conversation to expand • History persists across sessions'}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
