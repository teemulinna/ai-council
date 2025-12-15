import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '../../stores/canvasStore';

/**
 * EdgePanel - Elegant floating panel for edge editing
 *
 * Appears when an edge is selected, providing:
 * - Visual feedback of connection
 * - Delete action
 * - Flow direction info
 * - Keyboard shortcuts hint
 */
export default function EdgePanel() {
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const selectEdge = useCanvasStore((s) => s.selectEdge);

  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  // Get source and target node data
  const sourceNode = nodes.find((n) => n.id === selectedEdge?.source);
  const targetNode = nodes.find((n) => n.id === selectedEdge?.target);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (!selectedEdgeId) return;

      // Delete/Backspace to remove edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if focused on input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        removeEdge(selectedEdgeId);
        selectEdge(null);
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectEdge(null);
      }
    },
    [selectedEdgeId, removeEdge, selectEdge]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle delete click
  const handleDelete = () => {
    if (selectedEdgeId) {
      removeEdge(selectedEdgeId);
      selectEdge(null);
    }
  };

  // Handle close
  const handleClose = () => {
    selectEdge(null);
  };

  return (
    <AnimatePresence>
      {selectedEdge && sourceNode && targetNode && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10
                       rounded-2xl shadow-2xl overflow-hidden"
            style={{
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.15), 0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Content */}
            <div className="p-4 flex items-center gap-4">
              {/* Flow visualization */}
              <div className="flex items-center gap-3">
                {/* Source node */}
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/80 rounded-lg">
                  <span className="text-base">{getNodeIcon(sourceNode)}</span>
                  <div className="text-left">
                    <p className="text-xs font-medium text-text-primary">
                      {sourceNode.data.displayName}
                    </p>
                    <p className="text-[10px] text-text-muted">Source</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center">
                  <motion.div
                    className="flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {/* Animated line */}
                    <div className="w-8 h-0.5 bg-gradient-to-r from-accent-primary/40 to-accent-primary relative overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 w-4 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                        animate={{ x: [-16, 32] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    {/* Arrow head */}
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-accent-primary -ml-0.5">
                      <path
                        d="M2 2 L10 6 L2 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Target node */}
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/80 rounded-lg">
                  <span className="text-base">{getNodeIcon(targetNode)}</span>
                  <div className="text-left">
                    <p className="text-xs font-medium text-text-primary">
                      {targetNode.data.displayName}
                    </p>
                    <p className="text-[10px] text-text-muted">Target</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-white/10" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Delete button */}
                <button
                  onClick={handleDelete}
                  className="group flex items-center gap-2 px-3 py-2
                             bg-accent-error/10 hover:bg-accent-error/20
                             border border-accent-error/20 hover:border-accent-error/40
                             rounded-lg transition-all duration-200"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent-error"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  <span className="text-xs font-medium text-accent-error">
                    Delete
                  </span>
                </button>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="p-2 text-text-muted hover:text-text-primary
                             hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="px-4 py-2 bg-bg-tertiary/30 border-t border-white/5 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[9px] font-mono">Del</kbd>
                <span>delete</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[9px] font-mono">Esc</kbd>
                <span>close</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span>Drag endpoint to reconnect</span>
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper to get role icon for node
function getNodeIcon(node) {
  const roleIcons = {
    responder: '💬',
    devil_advocate: '😈',
    fact_checker: '🔍',
    creative: '💡',
    practical: '🛠️',
    expert: '🎓',
    synthesizer: '🔗',
    chairman: '👑',
    researcher: '📚',
    critic: '📝',
    strategist: '♟️',
    optimizer: '⚡',
  };
  return roleIcons[node?.data?.role] || '🤖';
}
