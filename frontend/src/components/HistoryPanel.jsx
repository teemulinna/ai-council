import { motion, AnimatePresence } from 'framer-motion';
import { useHistoryStore } from '../stores/historyStore';
import { formatCost, formatTokens } from '../utils/helpers';

export default function HistoryPanel({ isOpen, onClose, onViewLogs, onReplay }) {
  const conversations = useHistoryStore((s) => s.conversations);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  if (!isOpen) return null;

  const sortedConversations = [...conversations].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <h2 className="text-lg font-semibold text-text-primary">History</h2>
              <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded-full">
                {conversations.length} conversations
              </span>
            </div>
            <div className="flex items-center gap-2">
              {conversations.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all history?')) {
                      clearHistory();
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-accent-error transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg
                           text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh]">
            {sortedConversations.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-4xl block mb-3 opacity-50">📭</span>
                <p className="text-text-secondary">No conversations yet</p>
                <p className="text-xs text-text-muted mt-1">
                  Run a council to see your history here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {sortedConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary font-medium truncate mb-1">
                          {conv.query}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span>{new Date(conv.timestamp).toLocaleDateString()}</span>
                          <span>{new Date(conv.timestamp).toLocaleTimeString()}</span>
                          {conv.tokens && <span>{formatTokens(conv.tokens)} tokens</span>}
                          {conv.cost && <span>{formatCost(conv.cost)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewLogs(conv.id)}
                          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary
                                     bg-bg-tertiary hover:bg-white/10 rounded-lg transition-colors"
                        >
                          View logs
                        </button>
                        {conv.finalAnswer && (
                          <button
                            onClick={() => {
                              onReplay(conv);
                              onClose();
                            }}
                            className="px-3 py-1.5 text-xs text-accent-primary hover:text-accent-primary/80
                                       bg-accent-primary/10 hover:bg-accent-primary/20 rounded-lg transition-colors"
                          >
                            Replay
                          </button>
                        )}
                      </div>
                    </div>
                    {conv.finalAnswer && (
                      <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                        {conv.finalAnswer.content?.slice(0, 150)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
