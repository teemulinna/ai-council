import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExecutionStore } from '../stores/executionStore';
import { useCanvasStore } from '../stores/canvasStore';
import { providerColors, roleIcons, formatTokens } from '../utils/helpers';

// Truncate text with ellipsis
const truncate = (text, maxLength = 150) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Speech Bubble Component
function SpeechBubble({ node, content, isStreaming, isComplete, onClick }) {
  const providerColor = providerColors[node.data.provider] || '#64B5F6';
  const preview = truncate(content, 120);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="relative"
    >
      {/* Speech bubble */}
      <motion.div
        onClick={onClick}
        className={`
          p-3 rounded-xl cursor-pointer transition-all
          ${isStreaming ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/10'}
          hover:bg-white/15 hover:border-white/30
        `}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isComplete ? '#4DB6AC' : providerColor,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{roleIcons[node.data.role] || '💬'}</span>
          <span className="text-sm font-medium text-text-primary">
            {node.data.displayName}
          </span>
          {isStreaming && (
            <motion.span
              className="text-xs px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              typing...
            </motion.span>
          )}
          {isComplete && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              ✓ done
            </span>
          )}
        </div>

        {/* Content preview */}
        <p className="text-sm text-text-secondary leading-relaxed">
          {preview}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-1.5 h-4 bg-accent-primary ml-0.5 align-middle"
            />
          )}
        </p>

        {/* Click hint */}
        {content.length > 120 && (
          <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
            <span>👆</span>
            <span>Click to see full response</span>
          </p>
        )}
      </motion.div>

      {/* Bubble arrow */}
      <div
        className="absolute -left-2 top-4 w-0 h-0"
        style={{
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: `8px solid ${isStreaming ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
        }}
      />
    </motion.div>
  );
}

// Expanded Modal for full content
function ContentModal({ isOpen, onClose, node, content }) {
  if (!isOpen || !node) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] bg-bg-secondary rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${providerColors[node.data.provider]}30` }}
            >
              {roleIcons[node.data.role] || '💬'}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{node.data.displayName}</h3>
              <p className="text-xs text-text-muted">{node.data.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ExecutionProgress() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [expandedNodeId, setExpandedNodeId] = useState(null);
  const [smoothProgress, setSmoothProgress] = useState(0);

  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const currentStage = useExecutionStore((s) => s.currentStage);
  const currentQuery = useExecutionStore((s) => s.currentQuery);
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const streamingContent = useExecutionStore((s) => s.streamingContent);
  const responses = useExecutionStore((s) => s.responses);
  const totalTokens = useExecutionStore((s) => s.totalTokens);
  const startTime = useExecutionStore((s) => s.startTime);

  const nodes = useCanvasStore((s) => s.nodes);

  // Timer for elapsed time
  useEffect(() => {
    if (!isExecuting || !startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting, startTime]);

  // Smooth progress calculation - more gradual
  useEffect(() => {
    if (!isExecuting) {
      setSmoothProgress(0);
      return;
    }

    const participantNodes = nodes.filter((n) => !n.data.isChairman);
    const chairmanNode = nodes.find((n) => n.data.isChairman);
    const totalNodes = participantNodes.length + (chairmanNode ? 1 : 0);

    // Calculate base progress from completed responses
    const completedCount = Object.keys(responses).length;
    const baseProgress = (completedCount / totalNodes) * 100;

    // Add incremental progress for streaming nodes (5-15% per streaming node)
    const streamingNodes = Object.entries(nodeStates)
      .filter(([_, state]) => state === 'streaming' || state === 'active')
      .length;
    const streamingBonus = streamingNodes * (15 / totalNodes);

    // Target progress (capped at 95% until complete)
    const targetProgress = Math.min(baseProgress + streamingBonus, completedCount === totalNodes ? 100 : 95);

    // Smooth animation toward target
    const interval = setInterval(() => {
      setSmoothProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        // Move 10% of the remaining distance each tick
        return prev + diff * 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting, nodes, responses, nodeStates]);

  if (!isExecuting) return null;

  const participantNodes = nodes.filter((n) => !n.data.isChairman);
  const chairmanNode = nodes.find((n) => n.data.isChairman);

  // Calculate progress
  const completedResponses = Object.keys(responses).length;
  const totalNodesCount = participantNodes.length + (chairmanNode ? 1 : 0);
  const progressPercent = Math.round(smoothProgress);

  // Find current speaker
  const currentSpeaker = Object.entries(nodeStates)
    .find(([_, state]) => state === 'active' || state === 'streaming');
  const currentSpeakerId = currentSpeaker?.[0];
  const currentSpeakerNode = nodes.find(n => n.id === currentSpeakerId);

  // Get expanded node for modal
  const expandedNode = nodes.find(n => n.id === expandedNodeId);
  const expandedContent = expandedNodeId
    ? (responses[expandedNodeId]?.content || streamingContent[expandedNodeId] || '')
    : '';

  // Stage info
  const stages = [
    { id: 1, name: 'Perspectives', icon: '💭', color: '#64B5F6' },
    { id: 2, name: 'Evaluation', icon: '🔍', color: '#FFB74D' },
    { id: 3, name: 'Synthesis', icon: '👑', color: '#FFD54F' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden bg-bg-primary rounded-2xl border border-white/10 shadow-2xl"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                background: [
                  'radial-gradient(circle at 20% 20%, rgba(100, 181, 246, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(100, 181, 246, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 20% 20%, rgba(100, 181, 246, 0.1) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute inset-0"
            />
          </div>

          {/* Header */}
          <div className="relative px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Animated council icon */}
                <motion.div
                  className="relative w-14 h-14"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent-primary/20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    🏛️
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Council in Session</h2>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-red-500"
                      />
                      LIVE
                    </span>
                    <span>{elapsedTime}s</span>
                    <span>•</span>
                    <span>{formatTokens(totalTokens)} tokens</span>
                  </div>
                </div>
              </div>

              {/* Progress circle */}
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="6"
                  />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 226,
                      strokeDashoffset: 226 - (226 * smoothProgress) / 100,
                    }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#64B5F6" />
                      <stop offset="100%" stopColor="#4DB6AC" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-text-primary">{progressPercent}%</span>
                </div>
              </div>
            </div>

            {/* Original Question */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-3 bg-white/5 rounded-xl border-l-4 border-accent-primary"
            >
              <p className="text-xs text-accent-primary font-medium mb-1 uppercase tracking-wider">Question</p>
              <p className="text-text-primary font-medium">{currentQuery}</p>
            </motion.div>
          </div>

          {/* Stage Progress - Visual Pipeline */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/2">
            <div className="flex items-center justify-between">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center flex-1">
                  <motion.div
                    className={`relative flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                      currentStage === stage.id
                        ? 'bg-white/10'
                        : currentStage > stage.id
                        ? 'bg-green-500/10'
                        : 'opacity-50'
                    }`}
                    animate={currentStage === stage.id ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {/* Stage indicator */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        currentStage > stage.id
                          ? 'bg-green-500/20'
                          : currentStage === stage.id
                          ? 'bg-white/10'
                          : 'bg-white/5'
                      }`}
                      style={currentStage === stage.id ? { boxShadow: `0 0 20px ${stage.color}40` } : {}}
                    >
                      {currentStage > stage.id ? '✓' : stage.icon}
                    </div>
                    <div>
                      <p className={`font-medium ${currentStage >= stage.id ? 'text-text-primary' : 'text-text-muted'}`}>
                        {stage.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        Stage {stage.id}
                      </p>
                    </div>
                    {currentStage === stage.id && (
                      <motion.div
                        className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-accent-primary"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  {/* Connector line */}
                  {idx < stages.length - 1 && (
                    <div className="flex-1 h-1 mx-2 relative">
                      <div className="absolute inset-0 bg-white/10 rounded-full" />
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-accent-primary rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: currentStage > stage.id ? '100%' : '0%' }}
                        transition={{ duration: 0.5 }}
                      />
                      {currentStage === stage.id && (
                        <motion.div
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-primary"
                          animate={{ left: ['0%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content - Speech Bubbles View */}
          <div className="px-6 py-6 overflow-y-auto max-h-[50vh]">
            {/* Participant Grid with Speech Bubbles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participantNodes.map((node, index) => {
                const state = nodeStates[node.id] || 'pending';
                const streaming = streamingContent[node.id];
                const response = responses[node.id];
                const content = response?.content || streaming || '';
                const isActive = state === 'active' || state === 'streaming';
                const isComplete = state === 'complete';
                const providerColor = providerColors[node.data.provider] || '#64B5F6';

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {/* Node Avatar */}
                    <div className="flex items-center gap-3 mb-2">
                      <motion.div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                          isComplete
                            ? 'bg-green-500/20 border border-green-500/40'
                            : isActive
                            ? 'bg-accent-primary/20 border border-accent-primary/40'
                            : 'bg-white/5 border border-white/10'
                        }`}
                        style={isActive ? { boxShadow: `0 0 20px ${providerColor}40` } : {}}
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {isComplete ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          roleIcons[node.data.role] || '💬'
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-text-primary truncate">
                          {node.data.displayName}
                        </p>
                        <p className="text-xs text-text-muted">{node.data.role}</p>
                      </div>
                      {/* Order badge */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? 'bg-accent-primary text-white'
                            : 'bg-white/10 text-text-muted'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>

                    {/* Speech Bubble or Waiting State */}
                    {content ? (
                      <SpeechBubble
                        node={node}
                        content={content}
                        isStreaming={isActive}
                        isComplete={isComplete}
                        onClick={() => setExpandedNodeId(node.id)}
                      />
                    ) : (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 border-l-4" style={{ borderLeftColor: 'rgba(255,255,255,0.2)' }}>
                        <div className="flex items-center gap-2 text-text-muted text-sm">
                          {isActive ? (
                            <>
                              <motion.div
                                className="flex gap-1"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animation-delay-200" />
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animation-delay-400" />
                              </motion.div>
                              <span>Thinking...</span>
                            </>
                          ) : (
                            <>
                              <span>⏳</span>
                              <span>Waiting for turn</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Chairman Section */}
            {chairmanNode && currentStage === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-white/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-yellow-500/30 to-amber-600/20 border border-yellow-500/50"
                    style={{ boxShadow: '0 0 30px rgba(255, 213, 79, 0.2)' }}
                  >
                    👑
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-text-primary">Chairman Synthesis</h3>
                    <p className="text-xs text-text-muted">Combining all perspectives...</p>
                  </div>
                </div>

                {/* Chairman Speech Bubble */}
                {(streamingContent[chairmanNode.id] || responses[chairmanNode.id]) && (
                  <SpeechBubble
                    node={chairmanNode}
                    content={responses[chairmanNode.id]?.content || streamingContent[chairmanNode.id] || ''}
                    isStreaming={nodeStates[chairmanNode.id] === 'streaming' || nodeStates[chairmanNode.id] === 'active'}
                    isComplete={nodeStates[chairmanNode.id] === 'complete'}
                    onClick={() => setExpandedNodeId(chairmanNode.id)}
                  />
                )}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 bg-white/2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-text-muted">
                <span>{completedResponses}/{totalNodesCount} responses</span>
                <span>•</span>
                <span>Stage {currentStage}/3</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-500"
                />
                <span className="text-text-muted">Processing</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Expanded Content Modal */}
        <AnimatePresence>
          <ContentModal
            isOpen={!!expandedNodeId}
            onClose={() => setExpandedNodeId(null)}
            node={expandedNode}
            content={expandedContent}
          />
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
