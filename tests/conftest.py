"""Pytest configuration and shared fixtures."""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List
import json
import os

# Set test environment
os.environ["TESTING"] = "true"
os.environ["OPENROUTER_API_KEY"] = "test-key-12345"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_openrouter_response():
    """Mock successful OpenRouter API response."""
    return {
        "id": "test-response-id",
        "choices": [
            {
                "message": {
                    "content": "This is a test response from the model."
                }
            }
        ],
        "usage": {
            "prompt_tokens": 50,
            "completion_tokens": 100,
            "total_tokens": 150
        }
    }


@pytest.fixture
def mock_council_models():
    """Mock list of council models."""
    return [
        "anthropic/claude-3-opus-20240229",
        "openai/gpt-4-turbo-preview",
        "google/gemini-pro",
    ]


@pytest.fixture
def mock_stage1_responses():
    """Mock Stage 1 responses from multiple models."""
    return [
        {
            "model": "anthropic/claude-3-opus-20240229",
            "response": "Paris is the capital of France. It's known for the Eiffel Tower."
        },
        {
            "model": "openai/gpt-4-turbo-preview",
            "response": "The capital of France is Paris, a major European city."
        },
        {
            "model": "google/gemini-pro",
            "response": "Paris serves as the capital city of France."
        }
    ]


@pytest.fixture
def mock_stage2_responses():
    """Mock Stage 2 ranking responses."""
    return [
        {
            "model": "anthropic/claude-3-opus-20240229",
            "ranking": "Response A provides good detail. Response B is concise. Response C is accurate.\n\nFINAL RANKING:\n1. Response A\n2. Response C\n3. Response B",
            "parsed_ranking": ["Response A", "Response C", "Response B"]
        },
        {
            "model": "openai/gpt-4-turbo-preview",
            "ranking": "All responses are accurate.\n\nFINAL RANKING:\n1. Response A\n2. Response B\n3. Response C",
            "parsed_ranking": ["Response A", "Response B", "Response C"]
        }
    ]


@pytest.fixture
def mock_stage3_response():
    """Mock Stage 3 final synthesis response."""
    return {
        "model": "anthropic/claude-3-opus-20240229",
        "response": "Based on the council's analysis, Paris is definitively the capital of France. All models agree on this fact, with high confidence."
    }


@pytest.fixture
def mock_cache():
    """Mock cache instance."""
    from backend.cache import ResponseCache

    cache = ResponseCache()
    # Use in-memory cache for testing
    cache.use_redis = False
    cache.memory_cache = {}
    return cache


@pytest.fixture
def mock_api_client():
    """Mock HTTP client for API tests."""
    from httpx import AsyncClient
    from backend.main import app

    return AsyncClient(app=app, base_url="http://test")


@pytest.fixture
def sample_user_query():
    """Sample user query for testing."""
    return "What is the capital of France?"


@pytest.fixture
def sample_conversation():
    """Sample conversation for testing."""
    return {
        "id": "test-conv-123",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": []
    }


@pytest.fixture
def mock_cost_tracker():
    """Mock cost tracker."""
    from backend.cost_tracker import CostTracker

    tracker = CostTracker(budget_limit=10.0)
    return tracker


@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment before each test."""
    # Clear any test files
    test_data_dir = "data/test_conversations"
    if os.path.exists(test_data_dir):
        import shutil
        shutil.rmtree(test_data_dir)

    yield

    # Cleanup after test
    if os.path.exists(test_data_dir):
        import shutil
        shutil.rmtree(test_data_dir)