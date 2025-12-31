import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from '../utils/helpers';
import { API_BASE } from '../api';

export const useHistoryStore = create(
  persist(
    (set, get) => ({
      // Conversation history
      conversations: [], // { id, query, responses, finalAnswer, config, timestamp, tokens, cost }
      isLoading: false,
      lastSynced: null,

      // Sync with backend on app load
      syncWithBackend: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch(`${API_BASE}/api/history?limit=50`);
          if (response.ok) {
            const data = await response.json();
            const backendConversations = data.conversations || [];

            // Merge with local - backend is source of truth
            const local = get().conversations;
            const backendIds = new Set(backendConversations.map(c => c.id));

            // Keep local conversations that aren't in backend (might be unsaved)
            const localOnly = local.filter(c => !backendIds.has(c.id));

            // Merge: backend first, then local-only items
            const merged = [...backendConversations, ...localOnly]
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .slice(0, 50);

            set({
              conversations: merged,
              lastSynced: Date.now(),
              isLoading: false
            });

            // Push any local-only items to backend
            for (const conv of localOnly) {
              try {
                await fetch(`${API_BASE}/api/history`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(conv)
                });
              } catch (e) {
                console.warn('Failed to sync local conversation to backend:', conv.id);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to sync with backend, using local storage:', error);
          set({ isLoading: false });
        }
      },

      // Add a new conversation (saves to both local and backend)
      addConversation: async (conversation) => {
        const newConversation = {
          id: conversation.id || nanoid(),
          timestamp: Date.now(),
          ...conversation,
        };

        // Update local state immediately
        set((state) => ({
          conversations: [newConversation, ...state.conversations].slice(0, 50),
        }));

        // Save to backend
        try {
          await fetch(`${API_BASE}/api/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConversation)
          });
        } catch (error) {
          console.warn('Failed to save to backend:', error);
        }

        return newConversation.id;
      },

      // Get a conversation by ID
      getConversation: (id) => {
        return get().conversations.find((c) => c.id === id);
      },

      // Update a conversation
      updateConversation: async (id, updates) => {
        const updated = { ...get().getConversation(id), ...updates };

        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));

        // Save to backend
        try {
          await fetch(`${API_BASE}/api/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          });
        } catch (error) {
          console.warn('Failed to update in backend:', error);
        }
      },

      // Delete a conversation
      deleteConversation: async (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
        }));

        // Delete from backend
        try {
          await fetch(`${API_BASE}/api/history/${id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.warn('Failed to delete from backend:', error);
        }
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
        lastSynced: state.lastSynced,
      }),
    }
  )
);
