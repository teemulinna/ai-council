import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useExecutionStore } from '../../stores/executionStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { formatCost, formatTokens, providerColors } from '../../utils/helpers';

export default function ResultsPanel({ isVisible, onClose }) {
  const [activeTab, setActiveTab] = useState('final');

  const nodes = useCanvasStore((s) => s.nodes);
  const responses = useExecutionStore((s) => s.responses);
  const rankings = useExecutionStore((s) => s.rankings);
  const finalAnswer = useExecutionStore((s) => s.finalAnswer);
  const currentStage = useExecutionStore((s) => s.currentStage);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const totalTokens = useExecutionStore((s) => s.totalTokens);
  const totalCost = useExecutionStore((s) => s.totalCost);
  const getExecutionDuration = useExecutionStore((s) => s.getExecutionDuration);

  if (!isVisible) return null;

  const participantNodes = nodes.filter((n) => !n.data.isChairman);
  const duration = getExecutionDuration();

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-0 left-0 right-0 h-[50vh] bg-bg-secondary
                 border-t border-white/10 flex flex-col z-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
            {['final', 'individual', 'rankings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-accent-primary text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Stage indicator */}
          {isExecuting && (
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-accent-primary"
              />
              <span className="text-sm text-text-secondary">
                Stage {currentStage}/3
              </span>
            </div>
          )}
        </div>

        {/* Stats & Close */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{formatTokens(totalTokens)} tokens</span>
            <span>{formatCost(totalCost)}</span>
            {duration > 0 && <span>{duration}s</span>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-text-muted hover:text-text-primary hover:bg-white/5"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Final Answer Tab */}
          {activeTab === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="prose prose-invert prose-sm max-w-none"
            >
              {finalAnswer ? (
                <ReactMarkdown>{finalAnswer.content}</ReactMarkdown>
              ) : isExecuting ? (
                <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mb-4"
                  />
                  <p>Council is deliberating...</p>
                </div>
              ) : (
                <p className="text-text-muted text-center py-10">
                  Run the council to see results
                </p>
              )}
            </motion.div>
          )}

          {/* Individual Responses Tab */}
          {activeTab === 'individual' && (
            <motion.div
              key="individual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {participantNodes.map((node) => {
                const response = responses[node.id];
                return (
                  <div
                    key={node.id}
                    className="p-4 bg-bg-tertiary rounded-lg border border-white/5"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: providerColors[node.data.provider] }}
                      />
                      <span className="font-medium text-text-primary">
                        {node.data.displayName}
                      </span>
                      {response && (
                        <span className="ml-auto text-xs text-text-muted">
                          {formatTokens(response.tokens || 0)} tokens • {formatCost(response.cost || 0)}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    {response ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{response.content}</ReactMarkdown>
                      </div>
                    ) : isExecuting ? (
                      <div className="flex items-center gap-2 text-text-muted">
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-text-muted"
                        />
                        <span className="text-sm">Waiting...</span>
                      </div>
                    ) : (
                      <p className="text-text-muted text-sm">No response yet</p>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Rankings Tab */}
          {activeTab === 'rankings' && (
            <motion.div
              key="rankings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {Object.keys(rankings).length > 0 ? (
                participantNodes.map((node) => {
                  const ranking = rankings[node.id];
                  if (!ranking) return null;

                  return (
                    <div
                      key={node.id}
                      className="p-4 bg-bg-tertiary rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: providerColors[node.data.provider] }}
                        />
                        <span className="font-medium text-text-primary">
                          {node.data.displayName}'s Rankings
                        </span>
                      </div>

                      {ranking.rankings && (
                        <div className="space-y-2">
                          {ranking.rankings.map((r, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="w-6 h-6 flex items-center justify-center
                                             rounded-full bg-accent-primary/20 text-accent-primary
                                             text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-text-secondary">{r}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {ranking.reasoning && (
                        <p className="mt-3 pt-3 border-t border-white/5 text-sm text-text-muted">
                          {ranking.reasoning}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : isExecuting && currentStage >= 2 ? (
                <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-accent-warning border-t-transparent rounded-full mb-4"
                  />
                  <p>Evaluating responses...</p>
                </div>
              ) : (
                <p className="text-text-muted text-center py-10">
                  Rankings appear after Stage 2
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
