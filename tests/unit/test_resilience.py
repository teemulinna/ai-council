"""Unit tests for resilience module - TDD approach."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import asyncio
from backend.resilience import ResilientCouncil, ErrorRecovery, PartialResponseHandler
from backend.config import FALLBACK_MODELS


class TestResilientCouncil:
    """Test resilient council functionality."""

    @pytest.mark.asyncio
    async def test_successful_execution_with_all_models(self, mock_council_models):
        """Test that all models respond successfully."""
        council = ResilientCouncil(min_responses_required=3)

        with patch('backend.openrouter.query_models_parallel') as mock_query:
            mock_query.return_value = {
                "model1": {"content": "Response 1"},
                "model2": {"content": "Response 2"},
                "model3": {"content": "Response 3"},
            }

            responses = await council.execute_with_fallback(
                mock_council_models,
                [{"role": "user", "content": "Test"}]
            )

            assert len(responses) == 3
            assert all("content" in r for r in responses.values())
            mock_query.assert_called_once()

    @pytest.mark.asyncio
    async def test_fallback_on_partial_failure(self):
        """Test fallback models are used when primary models fail."""
        council = ResilientCouncil(min_responses_required=3)

        with patch('backend.openrouter.query_models_parallel') as mock_query:
            # First call: 2 successes, 1 failure
            mock_query.side_effect = [
                {
                    "model1": {"content": "Response 1"},
                    "model2": None,  # Failed
                    "model3": {"content": "Response 3"},
                },
                # Second call: fallback models
                {
                    FALLBACK_MODELS[0]: {"content": "Fallback response"},
                }
            ]

            responses = await council.execute_with_fallback(
                ["model1", "model2", "model3"],
                [{"role": "user", "content": "Test"}]
            )

            assert len(responses) == 3
            assert FALLBACK_MODELS[0] in responses
            assert mock_query.call_count == 2

    @pytest.mark.asyncio
    async def test_retry_with_exponential_backoff(self):
        """Test retry logic with exponential backoff."""
        council = ResilientCouncil()

        with patch('backend.openrouter.query_model') as mock_query:
            mock_query.side_effect = [None, None, {"content": "Success"}]

            with patch('asyncio.sleep') as mock_sleep:
                response = await council.execute_with_retry(
                    "test-model",
                    [{"role": "user", "content": "Test"}]
                )

                assert response == {"content": "Success"}
                assert mock_query.call_count == 3
                # Check exponential backoff delays
                assert mock_sleep.call_count == 2
                mock_sleep.assert_any_call(1.0)  # First retry
                mock_sleep.assert_any_call(2.0)  # Second retry

    def test_validate_response_catches_errors(self):
        """Test response validation catches error responses."""
        council = ResilientCouncil()

        # Valid response
        assert council.validate_response({"content": "This is a valid response"})

        # Invalid responses
        assert not council.validate_response({})
        assert not council.validate_response({"content": ""})
        assert not council.validate_response({"content": "Error: API failed"})
        assert not council.validate_response({"content": "rate limit exceeded"})

    def test_cost_estimation(self):
        """Test cost estimation for model queries."""
        council = ResilientCouncil()

        models = [
            "anthropic/claude-3-opus-20240229",
            "openai/gpt-4-turbo-preview",
            "google/gemini-pro"
        ]

        cost = council.estimate_cost(models, estimated_tokens=2000)

        # Check cost is reasonable (between $0.01 and $1.00 for 2K tokens)
        assert 0.01 < cost < 1.0
        assert isinstance(cost, float)


class TestErrorRecovery:
    """Test error recovery strategies."""

    def test_identify_rate_limit_error(self):
        """Test identification of rate limit errors."""
        error = Exception("Rate limit exceeded for model")
        strategy = ErrorRecovery.get_recovery_strategy(error)
        assert strategy == "rate_limit"

    def test_identify_timeout_error(self):
        """Test identification of timeout errors."""
        error = Exception("Request timeout after 30 seconds")
        strategy = ErrorRecovery.get_recovery_strategy(error)
        assert strategy == "timeout"

    def test_identify_auth_error(self):
        """Test identification of authentication errors."""
        error = Exception("Unauthorized: Invalid API key")
        strategy = ErrorRecovery.get_recovery_strategy(error)
        assert strategy == "auth_error"

    def test_should_use_cheaper_model_on_quota(self):
        """Test decision to use cheaper models on quota errors."""
        assert ErrorRecovery.should_use_cheaper_model("quota_exceeded")
        assert ErrorRecovery.should_use_cheaper_model("rate_limit")
        assert not ErrorRecovery.should_use_cheaper_model("timeout")

    @pytest.mark.asyncio
    async def test_handle_rate_limit_delay(self):
        """Test rate limit handling with delay."""
        with patch('asyncio.sleep') as mock_sleep:
            await ErrorRecovery.handle_rate_limit(delay=2.5)
            mock_sleep.assert_called_once_with(2.5)


class TestPartialResponseHandler:
    """Test partial response handling."""

    def test_can_proceed_with_minimum_responses(self):
        """Test determination of whether to proceed with partial responses."""
        responses = {
            "model1": {"content": "Valid response with good content"},
            "model2": {"content": "Another valid response"},
            "model3": None,
        }

        # Can proceed with 2 valid responses
        assert PartialResponseHandler.can_proceed_with_partial(responses, min_required=2)

        # Cannot proceed if we need 3
        assert not PartialResponseHandler.can_proceed_with_partial(responses, min_required=3)

    def test_adjust_stage2_for_partial_responses(self):
        """Test Stage 2 adjustment for partial Stage 1 results."""
        # With enough responses
        stage1_results = [
            {"model": "model1", "response": "Response 1"},
            {"model": "model2", "response": "Response 2"},
            {"model": "model3", "response": "Response 3"},
        ]

        adjusted = PartialResponseHandler.adjust_stage2_for_partial(stage1_results)
        assert len(adjusted) == 3

        # With too few responses
        stage1_results = [{"model": "model1", "response": "Response 1"}]
        adjusted = PartialResponseHandler.adjust_stage2_for_partial(stage1_results)
        assert len(adjusted) == 0  # Can't rank with just 1 response

    def test_validate_required_fields(self):
        """Test validation of required fields in responses."""
        valid_results = [
            {"model": "model1", "response": "Response 1"},
            {"model": "model2", "response": "Response 2"},
        ]

        invalid_results = [
            {"model": "model1"},  # Missing response
            {"response": "Response 2"},  # Missing model
        ]

        adjusted = PartialResponseHandler.adjust_stage2_for_partial(valid_results)
        assert len(adjusted) == 2

        adjusted = PartialResponseHandler.adjust_stage2_for_partial(invalid_results)
        assert len(adjusted) == 0