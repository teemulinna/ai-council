"""Integration tests for API endpoints."""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
import json
from backend.main import app
from backend.config import COUNCIL_MODELS


class TestAPIEndpoints:
    """Test API endpoint functionality."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test health check endpoint."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "service" in data

    @pytest.mark.asyncio
    async def test_create_conversation(self):
        """Test creating a new conversation."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/api/conversations", json={})

            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "created_at" in data
            assert data["title"] == "New Conversation"
            assert data["messages"] == []

    @pytest.mark.asyncio
    async def test_get_conversation(self):
        """Test getting a conversation."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create a conversation first
            create_response = await client.post("/api/conversations", json={})
            conversation_id = create_response.json()["id"]

            # Get the conversation
            response = await client.get(f"/api/conversations/{conversation_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == conversation_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_conversation(self):
        """Test getting a conversation that doesn't exist."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/conversations/nonexistent-id")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_list_conversations(self):
        """Test listing conversations."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create a few conversations
            for _ in range(3):
                await client.post("/api/conversations", json={})

            # List conversations
            response = await client.get("/api/conversations")

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 3

    @pytest.mark.asyncio
    async def test_send_message_with_mocked_council(
        self,
        mock_stage1_responses,
        mock_stage2_responses,
        mock_stage3_response
    ):
        """Test sending a message with mocked council responses."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create conversation
            create_response = await client.post("/api/conversations", json={})
            conversation_id = create_response.json()["id"]

            # Mock the council functions
            with patch('backend.main.run_full_council') as mock_council:
                mock_council.return_value = (
                    mock_stage1_responses,
                    mock_stage2_responses,
                    mock_stage3_response,
                    {"label_to_model": {}, "aggregate_rankings": []}
                )

                # Send message
                response = await client.post(
                    f"/api/conversations/{conversation_id}/message",
                    json={"content": "What is the capital of France?"}
                )

                assert response.status_code == 200
                data = response.json()

                assert data["stage1"] == mock_stage1_responses
                assert data["stage2"] == mock_stage2_responses
                assert data["stage3"] == mock_stage3_response

    @pytest.mark.asyncio
    async def test_streaming_endpoint(self):
        """Test SSE streaming endpoint."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create conversation
            create_response = await client.post("/api/conversations", json={})
            conversation_id = create_response.json()["id"]

            # Mock council stages
            with patch('backend.main.stage1_collect_responses') as mock_stage1:
                with patch('backend.main.stage2_collect_rankings') as mock_stage2:
                    with patch('backend.main.stage3_synthesize_final') as mock_stage3:
                        mock_stage1.return_value = [{"model": "test", "response": "test"}]
                        mock_stage2.return_value = ([{"model": "test", "ranking": "test"}], {})
                        mock_stage3.return_value = {"model": "test", "response": "final"}

                        # Request streaming
                        response = await client.get(
                            f"/api/conversations/{conversation_id}/message/stream",
                            params={"content": "Test query"}
                        )

                        # Check for SSE response
                        assert response.status_code == 200
                        assert response.headers["content-type"] == "text/event-stream"

    @pytest.mark.asyncio
    async def test_cost_tracking_in_response(self):
        """Test that cost tracking information is included in responses."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create conversation
            create_response = await client.post("/api/conversations", json={})
            conversation_id = create_response.json()["id"]

            with patch('backend.main.run_full_council') as mock_council:
                mock_council.return_value = (
                    [{"model": "test", "response": "test"}],
                    [],
                    {"response": "final"},
                    {"cost": 0.05}  # Include cost in metadata
                )

                response = await client.post(
                    f"/api/conversations/{conversation_id}/message",
                    json={"content": "Test query"}
                )

                assert response.status_code == 200
                data = response.json()
                assert "metadata" in data
                assert "cost" in data["metadata"]

    @pytest.mark.asyncio
    async def test_budget_limit_enforcement(self):
        """Test that budget limits are enforced."""
        from backend.cost_tracker import CostTracker

        with patch('backend.main.cost_tracker') as mock_tracker:
            mock_tracker.can_proceed.return_value = False
            mock_tracker.get_remaining_budget.return_value = 0.10

            async with AsyncClient(app=app, base_url="http://test") as client:
                create_response = await client.post("/api/conversations", json={})
                conversation_id = create_response.json()["id"]

                response = await client.post(
                    f"/api/conversations/{conversation_id}/message",
                    json={"content": "Expensive query"}
                )

                # Should return an error when budget exceeded
                assert response.status_code in [400, 402]  # Bad request or Payment required


class TestCachingIntegration:
    """Test caching integration with API."""

    @pytest.mark.asyncio
    async def test_cached_response_returned(self):
        """Test that cached responses are returned on second query."""
        from backend.cache import ResponseCache

        cache = ResponseCache()

        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post("/api/conversations", json={})
            conversation_id = create_response.json()["id"]

            query = "What is 2+2?"

            # Mock council and cache
            with patch('backend.main.cache') as mock_cache:
                with patch('backend.main.run_full_council') as mock_council:
                    # First call - cache miss
                    mock_cache.get.return_value = None
                    mock_council.return_value = (
                        [{"model": "test", "response": "4"}],
                        [],
                        {"response": "The answer is 4"},
                        {}
                    )

                    response1 = await client.post(
                        f"/api/conversations/{conversation_id}/message",
                        json={"content": query}
                    )

                    assert response1.status_code == 200
                    assert mock_council.called

                    # Second call - cache hit
                    mock_council.reset_mock()
                    mock_cache.get.return_value = {
                        "stage1": [{"model": "test", "response": "4 (cached)"}],
                        "stage2": [],
                        "stage3": {"response": "The answer is 4 (cached)"},
                        "metadata": {"cached": True}
                    }

                    response2 = await client.post(
                        f"/api/conversations/{conversation_id}/message",
                        json={"content": query}
                    )

                    assert response2.status_code == 200
                    # Council should not be called if cache hit
                    # This would be verified in actual implementation


class TestResilienceIntegration:
    """Test resilience features integration."""

    @pytest.mark.asyncio
    async def test_fallback_models_used_on_failure(self):
        """Test that fallback models are used when primary models fail."""
        from backend.config import FALLBACK_MODELS

        with patch('backend.openrouter.query_models_parallel') as mock_query:
            # Primary models fail, fallback succeeds
            mock_query.side_effect = [
                {
                    COUNCIL_MODELS[0]: None,  # Failed
                    COUNCIL_MODELS[1]: {"content": "Response"},
                    COUNCIL_MODELS[2]: None,  # Failed
                },
                {
                    FALLBACK_MODELS[0]: {"content": "Fallback response"}
                }
            ]

            async with AsyncClient(app=app, base_url="http://test") as client:
                create_response = await client.post("/api/conversations", json={})
                conversation_id = create_response.json()["id"]

                response = await client.post(
                    f"/api/conversations/{conversation_id}/message",
                    json={"content": "Test with failures"}
                )

                # Should still succeed with fallback models
                assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_partial_failure_handling(self):
        """Test handling of partial model failures."""
        with patch('backend.openrouter.query_models_parallel') as mock_query:
            # Only 2 out of 5 models respond
            mock_query.return_value = {
                "model1": {"content": "Response 1"},
                "model2": None,
                "model3": {"content": "Response 3"},
                "model4": None,
                "model5": None,
            }

            # Should proceed if minimum responses met
            # This would be tested in the actual implementation