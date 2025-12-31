import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useExecutionStore } from '../../stores/executionStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { formatCost, formatTokens, providerColors, roleIcons } from '../../utils/helpers';

// Extract brief summary from content (first paragraph or first 2 sentences)
function extractBrief(content, maxLength = 200) {
  if (!content) return '';

  // Try to get first paragraph
  const paragraphs = content.split(/\n\n+/);
  if (paragraphs[0] && paragraphs[0].length <= maxLength * 1.5) {
    return paragraphs[0];
  }

  // Otherwise get first 2 sentences
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  const brief = sentences.slice(0, 2).join(' ').trim();

  if (brief.length <= maxLength) return brief;
  return content.substring(0, maxLength).trim() + '...';
}

// Collapsible Card Component
function CollapsibleCard({ title, subtitle, icon, color, children, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-tertiary rounded-xl border border-white/5 overflow-hidden"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-medium text-text-primary text-sm truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-text-muted truncate">{subtitle}</p>
          )}
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted"
        >
          ▼
        </motion.span>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResultsPanel({ isVisible, onClose }) {
  const [activeTab, setActiveTab] = useState('summary'); // Default to summary now

  const nodes = useCanvasStore((s) => s.nodes);
  const responses = useExecutionStore((s) => s.responses);
  const rankings = useExecutionStore((s) => s.rankings);
  const finalAnswer = useExecutionStore((s) => s.finalAnswer);
  const currentQuery = useExecutionStore((s) => s.currentQuery);
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
      className="absolute bottom-0 left-0 right-0 h-[60vh] sm:h-[50vh] bg-bg-secondary
                 border-t border-white/10 rounded-t-2xl sm:rounded-t-xl flex flex-col z-10 elevation-3"
    >
      {/* Header - responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-white/10 gap-3 sm:gap-0">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />

        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Tabs */}
          <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1 flex-1 sm:flex-initial">
            {[
              { id: 'summary', label: '✨ Summary', shortLabel: 'Summary' },
              { id: 'discussion', label: '💬 Discussion', shortLabel: 'Discussion' },
              { id: 'individual', label: '👥 Individual', shortLabel: 'Individual' },
              { id: 'rankings', label: '🏆 Rankings', shortLabel: 'Rankings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent-primary text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="hide-mobile">{tab.label}</span>
                <span className="hide-desktop">{tab.shortLabel}</span>
              </button>
            ))}
          </div>

          {/* Stage indicator */}
          {isExecuting && (
            <div className="flex items-center gap-2 hide-mobile">
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
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-text-muted">
            <span className="hide-mobile">{formatTokens(totalTokens)} tokens</span>
            <span className="font-medium">{formatCost(totalCost)}</span>
            {duration > 0 && <span>{duration}s</span>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close results panel"
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-text-muted hover:text-text-primary hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Summary Tab - Brief Overview with Expandable Details */}
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 max-w-4xl mx-auto"
            >
              {/* TL;DR - The Answer */}
              {finalAnswer ? (
                <div className="bg-gradient-to-br from-accent-gold/10 via-accent-gold/5 to-transparent border border-accent-gold/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-gold/20 flex items-center justify-center text-xl">
                      👑
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">The Answer</h3>
                      <p className="text-xs text-text-muted">Council consensus</p>
                    </div>
                  </div>

                  {/* Brief summary shown by default */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{extractBrief(finalAnswer.content, 300)}</ReactMarkdown>
                  </div>

                  {/* Expand for full answer */}
                  {finalAnswer.content.length > 300 && (
                    <CollapsibleCard
                      title="Read Full Answer"
                      subtitle={`${formatTokens(finalAnswer.tokens || 0)} tokens`}
                      icon="📜"
                      color="#FFD54F"
                    >
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{finalAnswer.content}</ReactMarkdown>
                      </div>
                    </CollapsibleCard>
                  )}
                </div>
              ) : isExecuting ? (
                <div className="bg-gradient-to-br from-accent-primary/10 to-transparent border border-accent-primary/20 rounded-2xl p-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 border-3 border-accent-primary border-t-transparent rounded-full mb-4"
                    />
                    <p className="text-text-primary font-medium">Council is deliberating...</p>
                    <p className="text-sm text-text-muted mt-1">
                      {currentStage === 1 && 'Gathering perspectives'}
                      {currentStage === 2 && 'Peer review in progress'}
                      {currentStage === 3 && 'Chairman synthesizing'}
                    </p>
                  </div>
                </div>
              ) : currentQuery ? (
                <div className="text-center py-8 text-text-muted">
                  <span className="text-3xl mb-3 block">⏳</span>
                  <p>Waiting for council to complete</p>
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <span className="text-3xl mb-3 block">💭</span>
                  <p>Ask a question to see the council's answer</p>
                </div>
              )}

              {/* Quick Stats */}
              {(finalAnswer || Object.keys(responses).length > 0) && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center border border-white/5">
                    <p className="text-lg font-bold text-text-primary">{participantNodes.length}</p>
                    <p className="text-xs text-text-muted">Participants</p>
                  </div>
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center border border-white/5">
                    <p className="text-lg font-bold text-text-primary">{formatTokens(totalTokens)}</p>
                    <p className="text-xs text-text-muted">Tokens</p>
                  </div>
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center border border-white/5">
                    <p className="text-lg font-bold text-text-primary">{formatCost(totalCost)}</p>
                    <p className="text-xs text-text-muted">Cost</p>
                  </div>
                </div>
              )}

              {/* Participant Highlights - Expandable Cards */}
              {Object.keys(responses).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider px-1">
                    Council Perspectives
                  </h4>

                  {participantNodes.map((node, index) => {
                    const response = responses[node.id];
                    const ranking = rankings[node.id];
                    const providerColor = providerColors[node.data.provider] || '#64B5F6';
                    const roleIcon = roleIcons?.[node.data.role] || '💬';

                    if (!response) return null;

                    return (
                      <CollapsibleCard
                        key={node.id}
                        title={node.data.displayName}
                        subtitle={extractBrief(response.content, 80)}
                        icon={roleIcon}
                        color={providerColor}
                      >
                        <div className="space-y-3">
                          {/* Full Response */}
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{response.content}</ReactMarkdown>
                          </div>

                          {/* Rankings if available */}
                          {ranking?.rankings && (
                            <div className="pt-3 mt-3 border-t border-white/10">
                              <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                                Their Rankings
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {ranking.rankings.map((r, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs rounded-full bg-accent-primary/20 text-accent-primary"
                                  >
                                    #{idx + 1} {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-3 pt-2 text-xs text-text-muted">
                            <span>{formatTokens(response.tokens || 0)} tokens</span>
                            <span>•</span>
                            <span>{formatCost(response.cost || 0)}</span>
                          </div>
                        </div>
                      </CollapsibleCard>
                    );
                  })}
                </div>
              )}

              {/* Question Asked */}
              {currentQuery && (
                <div className="bg-white/5 rounded-xl p-4 border-l-4 border-accent-primary">
                  <p className="text-xs text-accent-primary font-medium mb-1 uppercase tracking-wider">Original Question</p>
                  <p className="text-text-primary">{currentQuery}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Discussion Tab - Visual Conversation Flow */}
          {activeTab === 'discussion' && (
            <motion.div
              key="discussion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              {/* Original Question - Prominent Display */}
              {currentQuery && (
                <div className="relative">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-accent-primary to-accent-primary/30 rounded-full" />
                  <div className="bg-gradient-to-r from-accent-primary/10 to-transparent border border-accent-primary/20 rounded-xl p-5 ml-2">
                    <div className="flex items-center gap-2 mb-3 text-xs text-accent-primary font-medium uppercase tracking-wider">
                      <span>❓</span>
                      <span>Original Question</span>
                    </div>
                    <p className="text-lg sm:text-xl text-text-primary font-medium leading-relaxed">
                      {currentQuery}
                    </p>
                  </div>
                </div>
              )}

              {/* Participant Responses - Chat Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider px-2">
                  <span>💭</span>
                  <span>Council Perspectives</span>
                  {isExecuting && currentStage === 1 && (
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="ml-2 text-accent-primary"
                    >
                      Gathering responses...
                    </motion.span>
                  )}
                </div>

                {participantNodes.map((node, index) => {
                  const response = responses[node.id];
                  const roleIcon = roleIcons?.[node.data.role] || node.data.roleIcon || '💬';
                  const providerColor = providerColors[node.data.provider] || '#64B5F6';

                  return (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-3"
                    >
                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg"
                        style={{ backgroundColor: `${providerColor}20`, borderColor: providerColor, borderWidth: 1 }}
                      >
                        {roleIcon}
                      </div>

                      {/* Message Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-text-primary text-sm">
                            {node.data.displayName}
                          </span>
                          <span className="text-xs text-text-muted">
                            {node.data.role || 'Participant'}
                          </span>
                          {response && (
                            <span className="text-xs text-text-muted ml-auto">
                              {formatTokens(response.tokens || 0)} tokens
                            </span>
                          )}
                        </div>

                        <div
                          className="bg-bg-tertiary rounded-xl rounded-tl-sm p-4 border border-white/5"
                          style={{ borderLeftColor: providerColor, borderLeftWidth: 3 }}
                        >
                          {response ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown>{response.content}</ReactMarkdown>
                            </div>
                          ) : isExecuting ? (
                            <div className="flex items-center gap-2 text-text-muted py-2">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="w-2 h-2 rounded-full bg-text-muted"
                              />
                              <span className="text-sm">Thinking...</span>
                            </div>
                          ) : (
                            <p className="text-text-muted text-sm italic">Awaiting response</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Chairman's Synthesis */}
              {finalAnswer && (
                <div className="relative mt-8">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-accent-gold to-accent-gold/30 rounded-full" />
                  <div className="bg-gradient-to-r from-accent-gold/10 to-transparent border border-accent-gold/20 rounded-xl p-5 ml-2">
                    <div className="flex items-center gap-2 mb-3 text-xs text-accent-gold font-medium uppercase tracking-wider">
                      <span>👑</span>
                      <span>Chairman's Synthesis</span>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{finalAnswer.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading state for chairman */}
              {isExecuting && currentStage === 3 && !finalAnswer && (
                <div className="relative mt-8">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-accent-gold/50 to-accent-gold/10 rounded-full" />
                  <div className="bg-gradient-to-r from-accent-gold/5 to-transparent border border-accent-gold/10 rounded-xl p-5 ml-2">
                    <div className="flex items-center gap-3 text-accent-gold">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-accent-gold border-t-transparent rounded-full"
                      />
                      <span className="text-sm">Chairman is synthesizing the discussion...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!currentQuery && !isExecuting && (
                <div className="text-center py-12 text-text-muted">
                  <span className="text-4xl mb-4 block">💭</span>
                  <p>Run the council to see the discussion</p>
                </div>
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
