import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from '../utils/helpers';

export const useHistoryStore = create(
  persist(
    (set, get) => ({
      // Conversation history
      conversations: [], // { id, query, responses, finalAnswer, config, timestamp, tokens, cost }

      // Add a new conversation
      addConversation: (conversation) => {
        const newConversation = {
          id: nanoid(),
          timestamp: Date.now(),
          ...conversation,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations].slice(0, 50), // Keep last 50
        }));

        return newConversation.id;
      },

      // Get a conversation by ID
      getConversation: (id) => {
        return get().conversations.find((c) => c.id === id);
      },

      // Update a conversation
      updateConversation: (id, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      // Delete a conversation
      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
        }));
      },

      // Clear all history
      clearHistory: () => set({ conversations: [] }),

      // Get recent conversations (for quick access)
      getRecentConversations: (limit = 10) => {
        return get().conversations.slice(0, limit);
      },

      // Search conversations
      searchConversations: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().conversations.filter(
          (c) =>
            c.query?.toLowerCase().includes(lowerQuery) ||
            c.finalAnswer?.content?.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: 'council-history',
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);
