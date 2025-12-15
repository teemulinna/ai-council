/**
 * API client for the LLM Council backend.
 * Enhanced with role management and council composition endpoints.
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8347';

export const api = {
  /* ═══════════════════════════════════════════════════════════
     CONVERSATIONS
     ═══════════════════════════════════════════════════════════ */

  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {object} councilConfig - Optional council configuration with agents and roles
   */
  async sendMessage(conversationId, content, councilConfig = null) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          council_config: councilConfig
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @param {object} councilConfig - Optional council configuration
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent, councilConfig = null) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          council_config: councilConfig
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ROLES & MODELS
     ═══════════════════════════════════════════════════════════ */

  /**
   * List available agent roles.
   */
  async listRoles() {
    const response = await fetch(`${API_BASE}/api/roles`);
    if (!response.ok) {
      throw new Error('Failed to list roles');
    }
    return response.json();
  },

  /**
   * List available models grouped by tier.
   */
  async listModels() {
    try {
      const response = await fetch(`${API_BASE}/api/council/models`);
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      return {
        premium: data.premium || [],
        standard: data.standard || [],
        budget: data.budget || [],
        details: data.details || {}
      };
    } catch (error) {
      console.error('Failed to fetch models from backend:', error);
      // Fallback to basic models
      return {
        premium: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
        standard: ['openai/gpt-3.5-turbo', 'google/gemini-pro'],
        budget: ['meta-llama/llama-3.1-8b-instruct', 'mistralai/mistral-7b-instruct']
      };
    }
  },

  /* ═══════════════════════════════════════════════════════════
     COUNCIL PRESETS
     ═══════════════════════════════════════════════════════════ */

  /**
   * List all available council presets.
   */
  async listPresets() {
    const response = await fetch(`${API_BASE}/api/council/presets`);
    if (!response.ok) {
      throw new Error('Failed to list presets');
    }
    return response.json();
  },

  /**
   * Get a specific preset by ID.
   * @param {string} presetId - Preset ID
   */
  async getPreset(presetId) {
    const response = await fetch(`${API_BASE}/api/council/presets/${presetId}`);
    if (!response.ok) {
      throw new Error('Failed to get preset');
    }
    return response.json();
  },

  /**
   * Compose a council from a preset.
   * @param {string} presetId - Preset ID to use
   */
  async composeFromPreset(presetId) {
    const response = await fetch(`${API_BASE}/api/council/presets/${presetId}/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to compose from preset');
    }
    return response.json();
  },

  /* ═══════════════════════════════════════════════════════════
     COUNCIL COMPOSITION
     ═══════════════════════════════════════════════════════════ */

  /**
   * Compose a council with intelligent role assignments.
   * @param {number} agentCount - Number of agents (2-10)
   * @param {string[]} models - Optional specific models to use
   * @param {string} mode - Composition mode: balanced, specialized, diverse
   */
  async composeCouncil(agentCount = 5, models = null, mode = 'balanced') {
    const response = await fetch(`${API_BASE}/api/council/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_count: agentCount,
        models,
        mode,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to compose council');
    }
    return response.json();
  },

  /**
   * Add an agent to existing council.
   * @param {string} model - Optional specific model to add
   */
  async addAgent(model = null) {
    const response = await fetch(`${API_BASE}/api/council/add-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model }),
    });
    if (!response.ok) {
      throw new Error('Failed to add agent');
    }
    return response.json();
  },

  /**
   * Remove an agent from council.
   * @param {number} agentIndex - Index of agent to remove
   */
  async removeAgent(agentIndex) {
    const response = await fetch(`${API_BASE}/api/council/remove-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_index: agentIndex }),
    });
    if (!response.ok) {
      throw new Error('Failed to remove agent');
    }
    return response.json();
  },
};
