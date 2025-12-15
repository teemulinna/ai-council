import { create } from 'zustand';

export const useExecutionStore = create((set, get) => ({
  // Execution state
  isExecuting: false,
  currentStage: null, // 1, 2, or 3
  executionId: null,

  // Node states during execution
  nodeStates: {}, // { nodeId: 'pending' | 'active' | 'streaming' | 'complete' | 'error' }

  // Responses
  responses: {}, // { nodeId: { content, tokens, cost } }
  rankings: {}, // { nodeId: { rankings, reasoning } }
  finalAnswer: null,

  // Progress
  progress: {
    current: 0,
    total: 0,
    stage: 0,
  },

  // Streaming content
  streamingContent: {}, // { nodeId: 'partial content...' }

  // Metrics
  totalTokens: 0,
  totalCost: 0,
  startTime: null,
  endTime: null,

  // Actions
  startExecution: (executionId, totalNodes) => set({
    isExecuting: true,
    executionId,
    currentStage: 1,
    nodeStates: {},
    responses: {},
    rankings: {},
    finalAnswer: null,
    streamingContent: {},
    progress: { current: 0, total: totalNodes, stage: 1 },
    totalTokens: 0,
    totalCost: 0,
    startTime: Date.now(),
    endTime: null,
  }),

  setNodeState: (nodeId, state) => set((s) => ({
    nodeStates: { ...s.nodeStates, [nodeId]: state },
  })),

  setStreamingContent: (nodeId, content) => set((s) => ({
    streamingContent: { ...s.streamingContent, [nodeId]: content },
  })),

  appendStreamingContent: (nodeId, chunk) => set((s) => ({
    streamingContent: {
      ...s.streamingContent,
      [nodeId]: (s.streamingContent[nodeId] || '') + chunk,
    },
  })),

  setResponse: (nodeId, response) => set((s) => ({
    responses: { ...s.responses, [nodeId]: response },
    totalTokens: s.totalTokens + (response.tokens || 0),
    totalCost: s.totalCost + (response.cost || 0),
  })),

  setRanking: (nodeId, ranking) => set((s) => ({
    rankings: { ...s.rankings, [nodeId]: ranking },
  })),

  setFinalAnswer: (answer) => set({ finalAnswer: answer }),

  setStage: (stage) => set((s) => ({
    currentStage: stage,
    progress: { ...s.progress, stage },
  })),

  updateProgress: (current, total) => set((s) => ({
    progress: { ...s.progress, current, total },
  })),

  completeExecution: () => set({
    isExecuting: false,
    endTime: Date.now(),
  }),

  stopExecution: () => set({
    isExecuting: false,
    endTime: Date.now(),
  }),

  resetExecution: () => set({
    isExecuting: false,
    currentStage: null,
    executionId: null,
    nodeStates: {},
    responses: {},
    rankings: {},
    finalAnswer: null,
    streamingContent: {},
    progress: { current: 0, total: 0, stage: 0 },
    totalTokens: 0,
    totalCost: 0,
    startTime: null,
    endTime: null,
  }),

  // Restore from history - for replay functionality
  restoreFromHistory: (conversation) => {
    // Set all node states to complete
    const nodeStates = {};
    if (conversation.responses) {
      Object.keys(conversation.responses).forEach((nodeId) => {
        nodeStates[nodeId] = 'complete';
      });
    }

    set({
      isExecuting: false,
      currentStage: 3, // Final stage
      executionId: conversation.id || null,
      nodeStates,
      responses: conversation.responses || {},
      rankings: {},
      finalAnswer: conversation.finalAnswer || null,
      streamingContent: {},
      progress: { current: 0, total: 0, stage: 3 },
      totalTokens: conversation.tokens || 0,
      totalCost: conversation.cost || 0,
      startTime: conversation.timestamp || null,
      endTime: conversation.timestamp || null,
    });
  },

  // Computed
  getExecutionDuration: () => {
    const state = get();
    if (!state.startTime) return 0;
    const end = state.endTime || Date.now();
    return Math.round((end - state.startTime) / 1000);
  },
}));
