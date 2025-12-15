"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# =============================================================================
# 2025 FRONTIER MODELS - Updated November 2025
# =============================================================================

# Council members - diverse mix of frontier models
COUNCIL_MODELS = [
    "anthropic/claude-3.5-sonnet",           # Best balanced reasoning
    "openai/gpt-4o",                          # Strong multimodal
    "google/gemini-1.5-pro",                  # Large context, good analysis
    "deepseek/deepseek-chat",                 # Excellent value, strong reasoning
    "meta-llama/llama-3.1-70b-instruct",     # Best open-source
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "anthropic/claude-3.5-sonnet"

# Budget models for cost-conscious presets
BUDGET_MODELS = [
    "anthropic/claude-3.5-haiku",            # Fast & cheap Claude
    "openai/gpt-4o-mini",                     # Budget GPT-4
    "google/gemini-1.5-flash",               # Fast Gemini
    "deepseek/deepseek-chat",                # Ultra cheap, great quality
]

# Premium models for deep analysis
PREMIUM_MODELS = [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "google/gemini-1.5-pro",
    "anthropic/claude-3-opus",               # For complex reasoning
]

# Fallback models for resilience
FALLBACK_MODELS = [
    "anthropic/claude-3.5-haiku",
    "openai/gpt-4o-mini",
    "deepseek/deepseek-chat",
]

# =============================================================================
# MODEL PRICING (per 1M tokens) - Updated November 2025
# Format: {"input": price, "output": price}
# =============================================================================
MODEL_PRICING = {
    # Anthropic
    "anthropic/claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3.5-haiku": {"input": 0.25, "output": 1.25},
    "anthropic/claude-3-opus": {"input": 15.0, "output": 75.0},
    # OpenAI
    "openai/gpt-4o": {"input": 2.5, "output": 10.0},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.6},
    "openai/gpt-4-turbo": {"input": 10.0, "output": 30.0},
    # Google
    "google/gemini-1.5-pro": {"input": 1.25, "output": 5.0},
    "google/gemini-1.5-flash": {"input": 0.075, "output": 0.3},
    # DeepSeek
    "deepseek/deepseek-chat": {"input": 0.14, "output": 0.28},
    # Meta
    "meta-llama/llama-3.1-70b-instruct": {"input": 0.52, "output": 0.75},
    "meta-llama/llama-3.1-8b-instruct": {"input": 0.055, "output": 0.055},
}

# Legacy format for backward compatibility (average cost per 1K tokens)
MODEL_COSTS = {
    model: (pricing["input"] + pricing["output"]) / 2000  # per 1K tokens
    for model, pricing in MODEL_PRICING.items()
}

# Provider metadata for UI display
MODEL_PROVIDERS = {
    "anthropic": {"name": "Anthropic", "color": "#D4A574"},
    "openai": {"name": "OpenAI", "color": "#10A37F"},
    "google": {"name": "Google", "color": "#4285F4"},
    "deepseek": {"name": "DeepSeek", "color": "#5B6EE1"},
    "meta-llama": {"name": "Meta", "color": "#0668E1"},
}

# Budget and rate limiting
DEFAULT_MAX_BUDGET = 10.0  # Maximum spend per conversation in USD
DEFAULT_CACHE_TTL = 86400  # 24 hours in seconds

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
