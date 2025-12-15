import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExecutionStore } from '../executionStore';

describe('executionStore - restoreFromHistory', () => {
  beforeEach(() => {
    // Reset store state before each test
    useExecutionStore.getState().resetExecution();
    vi.clearAllMocks();
  });

  describe('Basic restoration functionality', () => {
    it('should restore responses correctly from conversation history', () => {
      const conversation = {
        id: 'conv-123',
        responses: {
          'node-1': { content: 'Response 1', tokens: 100, cost: 0.001 },
          'node-2': { content: 'Response 2', tokens: 150, cost: 0.0015 },
          'node-3': { content: 'Response 3', tokens: 200, cost: 0.002 },
        },
        finalAnswer: 'Final answer content',
        tokens: 450,
        cost: 0.0045,
        timestamp: 1700000000000,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.responses).toEqual(conversation.responses);
      expect(Object.keys(state.responses)).toHaveLength(3);
      expect(state.responses['node-1'].content).toBe('Response 1');
      expect(state.responses['node-2'].tokens).toBe(150);
      expect(state.responses['node-3'].cost).toBe(0.002);
    });

    it('should restore finalAnswer correctly', () => {
      const conversation = {
        id: 'conv-456',
        responses: {},
        finalAnswer: 'This is the final synthesized answer',
        tokens: 0,
        cost: 0,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.finalAnswer).toBe('This is the final synthesized answer');
    });

    it('should set nodeStates to "complete" for all response nodes', () => {
      const conversation = {
        id: 'conv-789',
        responses: {
          'agent-1': { content: 'Agent 1 response' },
          'agent-2': { content: 'Agent 2 response' },
          'agent-3': { content: 'Agent 3 response' },
          'agent-4': { content: 'Agent 4 response' },
        },
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.nodeStates).toEqual({
        'agent-1': 'complete',
        'agent-2': 'complete',
        'agent-3': 'complete',
        'agent-4': 'complete',
      });
      expect(Object.keys(state.nodeStates)).toHaveLength(4);
    });

    it('should set totalTokens and totalCost correctly', () => {
      const conversation = {
        id: 'conv-101',
        responses: {
          'node-1': { content: 'Response' },
        },
        tokens: 5000,
        cost: 0.125,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.totalTokens).toBe(5000);
      expect(state.totalCost).toBe(0.125);
    });

    it('should set currentStage to 3', () => {
      const conversation = {
        id: 'conv-202',
        responses: {},
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.currentStage).toBe(3);
    });

    it('should preserve conversation ID as executionId', () => {
      const conversation = {
        id: 'conv-unique-id-12345',
        responses: {},
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.executionId).toBe('conv-unique-id-12345');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty responses gracefully', () => {
      const conversation = {
        id: 'conv-empty',
        responses: {},
        finalAnswer: 'Some answer',
        tokens: 0,
        cost: 0,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.responses).toEqual({});
      expect(state.nodeStates).toEqual({});
      expect(state.finalAnswer).toBe('Some answer');
      expect(state.currentStage).toBe(3);
    });

    it('should handle missing responses property', () => {
      const conversation = {
        id: 'conv-no-responses',
        finalAnswer: 'Answer without responses',
        tokens: 100,
        cost: 0.01,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.responses).toEqual({});
      expect(state.nodeStates).toEqual({});
      expect(state.finalAnswer).toBe('Answer without responses');
    });

    it('should handle missing finalAnswer', () => {
      const conversation = {
        id: 'conv-no-final',
        responses: {
          'node-1': { content: 'Response 1' },
        },
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.finalAnswer).toBeNull();
      expect(state.responses).toEqual({
        'node-1': { content: 'Response 1' },
      });
    });

    it('should handle missing tokens and cost', () => {
      const conversation = {
        id: 'conv-no-metrics',
        responses: {
          'node-1': { content: 'Response' },
        },
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.totalTokens).toBe(0);
      expect(state.totalCost).toBe(0);
    });

    it('should handle missing conversation ID', () => {
      const conversation = {
        responses: {
          'node-1': { content: 'Response' },
        },
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.executionId).toBeNull();
    });

    it('should handle missing timestamp', () => {
      const conversation = {
        id: 'conv-no-timestamp',
        responses: {},
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
    });
  });

  describe('State consistency', () => {
    it('should reset execution state properly', () => {
      const conversation = {
        id: 'conv-reset-test',
        responses: {
          'node-1': { content: 'Response' },
        },
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.streamingContent).toEqual({});
      expect(state.rankings).toEqual({});
    });

    it('should set progress to stage 3 with zero current/total', () => {
      const conversation = {
        id: 'conv-progress',
        responses: {},
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();
      expect(state.progress).toEqual({
        current: 0,
        total: 0,
        stage: 3,
      });
    });

    it('should handle complex conversation with all fields', () => {
      const conversation = {
        id: 'conv-complex-123',
        responses: {
          'architect': { content: 'Architecture response', tokens: 500, cost: 0.005 },
          'researcher': { content: 'Research findings', tokens: 800, cost: 0.008 },
          'coder': { content: 'Code implementation', tokens: 1200, cost: 0.012 },
          'reviewer': { content: 'Code review', tokens: 300, cost: 0.003 },
        },
        finalAnswer: 'Comprehensive final synthesis of all agent responses',
        tokens: 2800,
        cost: 0.028,
        timestamp: 1700123456789,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();

      // Verify all responses restored
      expect(Object.keys(state.responses)).toHaveLength(4);
      expect(state.responses.architect.content).toBe('Architecture response');

      // Verify all nodes marked complete
      expect(Object.keys(state.nodeStates)).toHaveLength(4);
      Object.values(state.nodeStates).forEach((status) => {
        expect(status).toBe('complete');
      });

      // Verify metrics
      expect(state.totalTokens).toBe(2800);
      expect(state.totalCost).toBe(0.028);

      // Verify final answer
      expect(state.finalAnswer).toBe('Comprehensive final synthesis of all agent responses');

      // Verify execution state
      expect(state.executionId).toBe('conv-complex-123');
      expect(state.currentStage).toBe(3);
      expect(state.isExecuting).toBe(false);

      // Verify timestamps
      expect(state.startTime).toBe(1700123456789);
      expect(state.endTime).toBe(1700123456789);
    });

    it('should completely override previous state', () => {
      // First, set up some initial execution state
      useExecutionStore.getState().startExecution('initial-exec', 5);
      useExecutionStore.getState().setResponse('old-node', { content: 'Old response' });
      useExecutionStore.getState().setStage(2);

      // Now restore from history - should completely replace state
      const conversation = {
        id: 'conv-override',
        responses: {
          'new-node': { content: 'New response' },
        },
        finalAnswer: 'New final answer',
        tokens: 100,
        cost: 0.01,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();

      // Old state should be gone
      expect(state.responses['old-node']).toBeUndefined();
      expect(state.executionId).not.toBe('initial-exec');

      // New state should be present
      expect(state.responses['new-node']).toBeDefined();
      expect(state.executionId).toBe('conv-override');
      expect(state.currentStage).toBe(3);
      expect(state.finalAnswer).toBe('New final answer');
    });
  });

  describe('Integration with other store methods', () => {
    it('should restore state that can be read by getExecutionDuration', () => {
      const timestamp = Date.now() - 60000; // 60 seconds ago
      const conversation = {
        id: 'conv-duration',
        responses: {},
        timestamp,
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const duration = useExecutionStore.getState().getExecutionDuration();
      expect(duration).toBe(0); // Since startTime and endTime are the same
    });

    it('should preserve state after restore when accessing individual responses', () => {
      const conversation = {
        id: 'conv-access',
        responses: {
          'agent-1': { content: 'First', tokens: 10, cost: 0.001 },
          'agent-2': { content: 'Second', tokens: 20, cost: 0.002 },
        },
      };

      useExecutionStore.getState().restoreFromHistory(conversation);

      const state = useExecutionStore.getState();

      // Access responses individually
      expect(state.responses['agent-1'].content).toBe('First');
      expect(state.responses['agent-2'].tokens).toBe(20);

      // Ensure immutability - modifications shouldn't affect store
      const responseCopy = { ...state.responses };
      responseCopy['agent-3'] = { content: 'Third' };

      const newState = useExecutionStore.getState();
      expect(newState.responses['agent-3']).toBeUndefined();
    });
  });
});
