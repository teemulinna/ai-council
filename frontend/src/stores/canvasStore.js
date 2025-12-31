import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from '../utils/helpers';

// Default node position offset
const NODE_OFFSET = { x: 250, y: 150 };

export const useCanvasStore = create(
  persist(
    (set, get) => ({
      // State
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      councilName: 'Untitled Council',
      favouriteModels: [], // User's favourite models

      // Node operations
      addNode: (nodeData) => {
        const existingNodes = get().nodes;
        const position = {
          x: 100 + (existingNodes.length % 3) * NODE_OFFSET.x,
          y: 100 + Math.floor(existingNodes.length / 3) * NODE_OFFSET.y,
        };

        const newNode = {
          id: nanoid(),
          type: 'participant',
          position,
          data: {
            model: nodeData.model || 'anthropic/claude-3.5-sonnet',
            displayName: nodeData.displayName || 'Claude',
            role: nodeData.role || 'responder',
            systemPrompt: nodeData.systemPrompt || '',
            speakingOrder: existingNodes.length + 1,
            provider: nodeData.provider || 'anthropic',
            isChairman: nodeData.isChairman || false,
            temperature: nodeData.temperature || 0.7,
            reasoningPattern: nodeData.reasoningPattern || 'standard',
          },
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
        }));

        return newNode.id;
      },

      updateNode: (id, data) => set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        ),
      })),

      updateNodePosition: (id, position) => set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, position } : node
        ),
      })),

      removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      })),

      // Edge operations
      addEdge: (edge) => set((state) => ({
        edges: [...state.edges, { ...edge, id: nanoid() }],
      })),

      removeEdge: (id) => set((state) => ({
        edges: state.edges.filter((e) => e.id !== id),
      })),

      // Selection
      selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
      selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
      clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

      // Get selected node
      getSelectedNode: () => {
        const state = get();
        return state.nodes.find((n) => n.id === state.selectedNodeId);
      },

      // Favourites operations
      addFavourite: (modelId) => set((state) => ({
        favouriteModels: state.favouriteModels.includes(modelId)
          ? state.favouriteModels
          : [...state.favouriteModels, modelId],
      })),

      removeFavourite: (modelId) => set((state) => ({
        favouriteModels: state.favouriteModels.filter((id) => id !== modelId),
      })),

      toggleFavourite: (modelId) => set((state) => ({
        favouriteModels: state.favouriteModels.includes(modelId)
          ? state.favouriteModels.filter((id) => id !== modelId)
          : [...state.favouriteModels, modelId],
      })),

      isFavourite: (modelId) => get().favouriteModels.includes(modelId),

      // Council operations
      setCouncilName: (name) => set({ councilName: name }),

      clearCanvas: () => set({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        councilName: 'Untitled Council',
      }),

      // Load preset (atomic operation - clears and loads in one state update)
      loadPreset: (preset) => {
        // Create deep copies to ensure new object references for React Flow
        // Also ensure default values for any missing data fields
        const newNodes = preset.nodes.map(node => ({
          ...node,
          data: {
            reasoningPattern: 'standard', // Default first, so preset can override
            ...node.data,
          },
          position: { ...node.position },
        }));
        const newEdges = preset.edges.map(edge => ({ ...edge }));

        set({
          nodes: newNodes,
          edges: newEdges,
          councilName: preset.name,
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      },

      // Export config
      exportConfig: () => {
        const state = get();
        return {
          name: state.councilName,
          nodes: state.nodes,
          edges: state.edges,
        };
      },

      // React Flow handlers
      onNodesChange: (changes) => {
        set((state) => {
          const newNodes = [...state.nodes];
          changes.forEach((change) => {
            if (change.type === 'position' && change.position) {
              const idx = newNodes.findIndex((n) => n.id === change.id);
              if (idx !== -1) {
                newNodes[idx] = { ...newNodes[idx], position: change.position };
              }
            }
            if (change.type === 'remove') {
              const idx = newNodes.findIndex((n) => n.id === change.id);
              if (idx !== -1) newNodes.splice(idx, 1);
            }
          });
          return { nodes: newNodes };
        });
      },

      onEdgesChange: (changes) => {
        set((state) => {
          const newEdges = [...state.edges];
          changes.forEach((change) => {
            if (change.type === 'remove') {
              const idx = newEdges.findIndex((e) => e.id === change.id);
              if (idx !== -1) newEdges.splice(idx, 1);
            }
          });
          return { edges: newEdges };
        });
      },

      onConnect: (connection) => {
        set((state) => ({
          edges: [
            ...state.edges,
            {
              id: nanoid(),
              source: connection.source,
              target: connection.target,
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
              type: 'default',
              animated: false,
            },
          ],
        }));
      },

      // Edge reconnection - allows redirecting flow to different nodes
      onReconnect: (oldEdge, newConnection) => {
        set((state) => ({
          edges: state.edges.map((edge) =>
            edge.id === oldEdge.id
              ? {
                  ...edge,
                  source: newConnection.source,
                  target: newConnection.target,
                  sourceHandle: newConnection.sourceHandle,
                  targetHandle: newConnection.targetHandle,
                }
              : edge
          ),
        }));
      },

      // Update specific edge
      updateEdge: (id, updates) => set((state) => ({
        edges: state.edges.map((edge) =>
          edge.id === id ? { ...edge, ...updates } : edge
        ),
      })),
    }),
    {
      name: 'council-canvas',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        councilName: state.councilName,
        favouriteModels: state.favouriteModels,
      }),
    }
  )
);
