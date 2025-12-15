"""Integration tests for council with role assignments."""

import pytest
from backend.agent_roles import CouncilComposer, get_default_roles
from backend.council import stage1_collect_responses, run_full_council
from unittest.mock import AsyncMock, patch, MagicMock


class TestCouncilWithRoles:
    """Test council orchestration with role-based agents."""

    def test_council_composer_creates_valid_config(self):
        """Council composer should create valid configuration."""
        composer = CouncilComposer()
        council = composer.compose(agent_count=5, mode="balanced")

        assert "agents" in council
        assert len(council["agents"]) == 5
        assert "topology" in council
        assert "estimated_cost" in council

        # Verify each agent has required fields
        for agent in council["agents"]:
            assert "model" in agent
            assert "role" in agent
            assert agent["role"].name is not None
            assert agent["role"].display_name is not None

    def test_council_composer_assigns_unique_roles(self):
        """Council should assign different roles to different agents."""
        composer = CouncilComposer()
        council = composer.compose(agent_count=5, mode="balanced")

        role_names = [agent["role"].name for agent in council["agents"]]

        # Primary roles should be unique
        primary_roles = ["primary_responder", "devils_advocate", "fact_checker",
                        "creative_thinker", "practical_advisor"]
        for role in primary_roles:
            if role in role_names:
                assert role_names.count(role) == 1

    @pytest.mark.asyncio
    async def test_stage1_with_council_config(self):
        """Stage 1 should accept and use council configuration."""
        # Create council configuration
        composer = CouncilComposer()
        council = composer.compose(agent_count=3, mode="balanced")

        # Mock the query responses
        mock_responses = {
            council["agents"][0]["model"]: {
                "content": "Response from primary responder",
                "usage": {"total_tokens": 100}
            },
            council["agents"][1]["model"]: {
                "content": "Response from devil's advocate",
                "usage": {"total_tokens": 100}
            },
            council["agents"][2]["model"]: {
                "content": "Response from fact checker",
                "usage": {"total_tokens": 100}
            }
        }

        with patch('backend.council.resilient_council.execute_with_fallback',
                  new_callable=AsyncMock) as mock_query:
            # Mock returns response for single model at a time
            mock_query.side_effect = lambda models, messages: {
                models[0]: mock_responses.get(models[0])
            }

            with patch('backend.council.cache.get', new_callable=AsyncMock) as mock_cache_get:
                mock_cache_get.return_value = None  # No cache hits

                with patch('backend.council.cache.set', new_callable=AsyncMock):
                    results = await stage1_collect_responses(
                        "What is the capital of France?",
                        council_config=council
                    )

        # Verify results include role information
        assert len(results) == 3
        for result in results:
            assert "model" in result
            assert "response" in result
            assert "role" in result
            assert result["role"]["name"] is not None
            assert result["role"]["display_name"] is not None

    @pytest.mark.asyncio
    async def test_stage1_without_council_config_uses_defaults(self):
        """Stage 1 should use default model selection when no config provided."""
        mock_responses = {
            "anthropic/claude-3-opus-20240229": {
                "content": "Response 1",
                "usage": {"total_tokens": 100}
            },
            "anthropic/claude-3-sonnet-20240229": {
                "content": "Response 2",
                "usage": {"total_tokens": 100}
            }
        }

        with patch('backend.council.SmartModelSelector.select_models') as mock_select:
            mock_select.return_value = list(mock_responses.keys())

            with patch('backend.council.resilient_council.execute_with_fallback',
                      new_callable=AsyncMock) as mock_query:
                mock_query.side_effect = lambda models, messages: {
                    models[0]: mock_responses.get(models[0])
                }

                with patch('backend.council.cache.get', new_callable=AsyncMock) as mock_cache_get:
                    mock_cache_get.return_value = None

                    with patch('backend.council.cache.set', new_callable=AsyncMock):
                        results = await stage1_collect_responses(
                            "Test query",
                            use_smart_selection=True
                        )

        # Should still assign roles even without explicit config
        assert len(results) >= 1
        for result in results:
            assert "model" in result
            assert "response" in result

    def test_add_agent_to_council(self):
        """Adding agent should assign appropriate role."""
        composer = CouncilComposer()

        # Start with 3 agents
        council = composer.compose(agent_count=3, mode="balanced")
        assert len(council["agents"]) == 3

        # Add another agent
        updated = composer.add_agent(council, model="google/gemini-pro")

        assert len(updated["agents"]) == 4
        assert updated["agents"][3]["model"] == "google/gemini-pro"
        assert updated["agents"][3]["role"] is not None

    def test_remove_agent_from_council(self):
        """Removing agent should maintain minimum of 2 agents."""
        composer = CouncilComposer()

        council = composer.compose(agent_count=5, mode="balanced")
        assert len(council["agents"]) == 5

        # Remove agent at index 2
        updated = composer.remove_agent(council, agent_index=2)

        assert len(updated["agents"]) == 4

    def test_remove_agent_respects_minimum(self):
        """Should not allow removing agents below minimum."""
        composer = CouncilComposer()

        council = composer.compose(agent_count=2, mode="balanced")

        # Try to remove when at minimum - should raise error
        with pytest.raises(ValueError, match="minimum of 2 agents"):
            composer.remove_agent(council, agent_index=0)

    @pytest.mark.asyncio
    async def test_role_prompt_modifiers_applied(self):
        """Role-specific prompts should be applied to messages."""
        composer = CouncilComposer()
        council = composer.compose(agent_count=2, mode="balanced")

        # Mock to capture what messages are sent
        captured_messages = []

        async def capture_messages(models, messages):
            captured_messages.append({
                "model": models[0],
                "messages": messages
            })
            return {
                models[0]: {
                    "content": "Test response",
                    "usage": {"total_tokens": 50}
                }
            }

        with patch('backend.council.resilient_council.execute_with_fallback',
                  side_effect=capture_messages):
            with patch('backend.council.cache.get', new_callable=AsyncMock) as mock_cache:
                mock_cache.return_value = None

                with patch('backend.council.cache.set', new_callable=AsyncMock):
                    await stage1_collect_responses(
                        "Test query",
                        council_config=council
                    )

        # Verify role-specific system prompts were added
        assert len(captured_messages) == 2
        for captured in captured_messages:
            messages = captured["messages"]
            # Should have system message with role prompt modifier
            assert len(messages) == 2
            assert messages[0]["role"] == "system"
            assert len(messages[0]["content"]) > 0
            assert messages[1]["role"] == "user"


class TestRoleMetadataInResponses:
    """Test that role metadata is properly included in responses."""

    @pytest.mark.asyncio
    async def test_stage1_results_include_role_metadata(self):
        """Stage 1 results should include role information."""
        composer = CouncilComposer()
        council = composer.compose(agent_count=2, mode="balanced")

        mock_responses = {
            council["agents"][0]["model"]: {
                "content": "Response 1",
                "usage": {"total_tokens": 100}
            },
            council["agents"][1]["model"]: {
                "content": "Response 2",
                "usage": {"total_tokens": 100}
            }
        }

        with patch('backend.council.resilient_council.execute_with_fallback',
                  new_callable=AsyncMock) as mock_query:
            mock_query.side_effect = lambda models, messages: {
                models[0]: mock_responses.get(models[0])
            }

            with patch('backend.council.cache.get', new_callable=AsyncMock) as mock_cache:
                mock_cache.return_value = None

                with patch('backend.council.cache.set', new_callable=AsyncMock):
                    results = await stage1_collect_responses(
                        "Test query",
                        council_config=council
                    )

        # Verify role metadata structure
        for result in results:
            assert "role" in result
            assert "name" in result["role"]
            assert "display_name" in result["role"]
            assert "description" in result["role"]

            # Verify it matches one of the assigned roles
            role_name = result["role"]["name"]
            assigned_roles = [a["role"].name for a in council["agents"]]
            assert role_name in assigned_roles
