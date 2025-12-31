// Generate unique IDs
export const nanoid = () => {
  return Math.random().toString(36).substring(2, 11);
};

// Format cost display
export const formatCost = (cost) => {
  if (cost === 0) return '$0';
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
};

// Format token count
export const formatTokens = (tokens) => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
};

// Get provider from model string
export const getProvider = (model) => {
  if (model.startsWith('anthropic/')) return 'anthropic';
  if (model.startsWith('openai/')) return 'openai';
  if (model.startsWith('google/')) return 'google';
  if (model.startsWith('deepseek/')) return 'deepseek';
  if (model.startsWith('meta-llama/') || model.startsWith('nvidia/')) return 'meta';
  return 'other';
};

// Get display name from model string
export const getModelDisplayName = (model) => {
  const parts = model.split('/');
  const name = parts[parts.length - 1];

  // Common mappings - updated for 2025 models
  const displayNames = {
    // Anthropic Claude 4.5 series
    'claude-opus-4.5': 'Claude Opus 4.5',
    'claude-sonnet-4.5': 'Claude Sonnet 4.5',
    'claude-haiku-4.5': 'Claude Haiku 4.5',
    // OpenAI GPT-5 series
    'gpt-5.2-chat': 'ChatGPT 5.2',
    'gpt-5.2-pro': 'GPT-5.2 Pro',
    'gpt-5-pro': 'GPT-5 Pro',
    'gpt-5.1': 'GPT-5.1',
    // Google Gemini 3
    'gemini-3-pro-preview': 'Gemini 3 Pro',
    'gemini-2.5-flash-preview': 'Gemini 2.5 Flash',
    // DeepSeek
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek-r1': 'DeepSeek R1',
    // Meta Llama
    'llama-3.3-nemotron-super-49b-v1.5': 'Llama 3.3 49B',
  };

  return displayNames[name] || name;
};

// Provider colors
export const providerColors = {
  anthropic: '#D4A574',
  openai: '#10A37F',
  google: '#4285F4',
  deepseek: '#5B6EE1',
  meta: '#0668E1',
  other: '#6B6B6B',
};

// Role icons for visual identification
export const roleIcons = {
  'Primary Responder': '💬',
  "Devil's Advocate": '😈',
  'Fact Checker': '🔍',
  'Creative Thinker': '💡',
  'Practical Advisor': '🛠️',
  'Domain Expert': '🎓',
  'Synthesizer': '🔗',
  'Chairman': '👑',
  'Researcher': '📚',
  'Critic': '📝',
  'Strategist': '♟️',
  'Optimizer': '⚡',
};

// Available models - Updated for 2025 (from OpenRouter API)
// These will be replaced by dynamic fetching
export const AVAILABLE_MODELS = [
  // Anthropic Claude 4.5 series
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'anthropic', tier: 'premium', context: '200K' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'anthropic', tier: 'standard', context: '200K' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'anthropic', tier: 'budget', context: '200K' },
  // OpenAI GPT-5 series
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'openai', tier: 'standard', context: '128K' },
  { id: 'openai/gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'openai', tier: 'premium', context: '400K' },
  { id: 'openai/gpt-5.2-chat', name: 'ChatGPT 5.2', provider: 'openai', tier: 'standard', context: '128K' },
  // Google Gemini
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'google', tier: 'premium', context: '1M' },
  { id: 'google/gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash', provider: 'google', tier: 'budget', context: '1M' },
  // DeepSeek v3.2
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'deepseek', tier: 'budget', context: '64K' },
  { id: 'deepseek/deepseek-v3.2-speciale', name: 'DeepSeek V3.2 Speciale', provider: 'deepseek', tier: 'standard', context: '64K' },
  // Meta Llama via NVIDIA
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Llama 3.3 49B', provider: 'meta', tier: 'budget', context: '131K' },
];

// Available roles
export const AVAILABLE_ROLES = [
  { id: 'responder', name: 'Primary Responder', description: 'Provides comprehensive main answers', icon: '💬' },
  { id: 'devil_advocate', name: "Devil's Advocate", description: 'Challenges assumptions and finds weaknesses', icon: '😈' },
  { id: 'fact_checker', name: 'Fact Checker', description: 'Verifies accuracy and flags uncertainties', icon: '🔍' },
  { id: 'creative', name: 'Creative Thinker', description: 'Offers unconventional perspectives', icon: '💡' },
  { id: 'practical', name: 'Practical Advisor', description: 'Focuses on real-world applications', icon: '🛠️' },
  { id: 'expert', name: 'Domain Expert', description: 'Provides specialized knowledge', icon: '🎓' },
  { id: 'synthesizer', name: 'Synthesizer', description: 'Combines insights from all perspectives', icon: '🔗' },
  { id: 'chairman', name: 'Chairman', description: 'Final synthesis and decision making', icon: '👑' },
];

// Get role by ID
export const getRole = (roleId) => {
  return AVAILABLE_ROLES.find((r) => r.id === roleId) || AVAILABLE_ROLES[0];
};

// Get model by ID
export const getModel = (modelId) => {
  return AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
};
