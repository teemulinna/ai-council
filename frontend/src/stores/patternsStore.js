import { create } from 'zustand';
import { API_BASE } from '../api';

/**
 * Patterns Store - Manages reasoning patterns for council members
 */
export const usePatternsStore = create((set, get) => ({
  patterns: [],
  categories: {},
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch patterns from API
  fetchPatterns: async (force = false) => {
    const { lastFetched, patterns } = get();

    // Only fetch if not fetched recently (5 min cache) or forced
    const fiveMinutes = 5 * 60 * 1000;
    if (!force && patterns.length > 0 && lastFetched && (Date.now() - lastFetched) < fiveMinutes) {
      return patterns;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/api/patterns`);
      if (!response.ok) throw new Error('Failed to fetch patterns');

      const data = await response.json();

      set({
        patterns: data.patterns || [],
        categories: data.categories || {},
        isLoading: false,
        lastFetched: Date.now(),
      });

      return data.patterns;
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
      set({ error: error.message, isLoading: false });

      // Return default patterns on error
      return get().getDefaultPatterns();
    }
  },

  // Get pattern by ID
  getPattern: (patternId) => {
    const { patterns } = get();
    return patterns.find(p => p.id === patternId) || patterns[0];
  },

  // Get patterns by category
  getPatternsByCategory: (category) => {
    const { patterns } = get();
    return patterns.filter(p => p.category === category);
  },

  // Get patterns grouped by category
  getGroupedPatterns: () => {
    const { patterns, categories } = get();
    const grouped = {};

    Object.keys(categories).forEach(catId => {
      grouped[catId] = {
        ...categories[catId],
        patterns: patterns.filter(p => p.category === catId)
      };
    });

    return grouped;
  },

  // Default patterns (fallback if API fails)
  getDefaultPatterns: () => [
    { id: 'standard', name: 'Standard', description: 'Direct response', icon: '💬', category: 'basic' },
    { id: 'chain_of_thought', name: 'Chain of Thought', description: 'Step-by-step reasoning', icon: '🔗', category: 'reasoning' },
    { id: 'research', name: 'Research Mode', description: 'Thorough investigation', icon: '🔬', category: 'investigation' },
    { id: 'first_principles', name: 'First Principles', description: 'Fundamental analysis', icon: '🧱', category: 'reasoning' },
  ],
}));
