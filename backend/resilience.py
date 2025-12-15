"""Resilience and error handling for the LLM Council."""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from .config import FALLBACK_MODELS, MODEL_COSTS
from .openrouter import query_models_parallel, query_model

logger = logging.getLogger(__name__)


class ResilientCouncil:
    """Handles failures gracefully with fallback models and retry logic."""

    def __init__(self, min_responses_required: int = 3):
        """
        Initialize the resilient council.

        Args:
            min_responses_required: Minimum number of responses needed to proceed
        """
        self.min_responses_required = min_responses_required
        self.retry_attempts = 2
        self.retry_delay = 1.0  # seconds

    async def execute_with_fallback(
        self,
        primary_models: List[str],
        messages: List[Dict[str, str]],
        timeout: float = 30.0
    ) -> Dict[str, Any]:
        """
        Execute queries with fallback models if primary models fail.

        Args:
            primary_models: List of primary model identifiers
            messages: Chat messages to send
            timeout: Timeout for API calls

        Returns:
            Dictionary of successful responses
        """
        successful_responses = {}
        failed_models = []

        # Try primary models first
        logger.info(f"Querying {len(primary_models)} primary models")
        responses = await query_models_parallel(primary_models, messages, timeout)

        for model, response in responses.items():
            if response is not None:
                successful_responses[model] = response
                logger.info(f"✓ Success: {model}")
            else:
                failed_models.append(model)
                logger.warning(f"✗ Failed: {model}")

        # Check if we have enough responses
        if len(successful_responses) >= self.min_responses_required:
            logger.info(f"Got {len(successful_responses)} responses, proceeding")
            return successful_responses

        # Use fallback models for failures
        models_needed = self.min_responses_required - len(successful_responses)
        if failed_models and models_needed > 0:
            logger.info(f"Need {models_needed} more responses, trying fallbacks")

            # Select fallback models not already used
            available_fallbacks = [
                m for m in FALLBACK_MODELS
                if m not in primary_models and m not in successful_responses
            ]

            if available_fallbacks:
                fallback_to_use = available_fallbacks[:models_needed]
                logger.info(f"Using fallback models: {fallback_to_use}")

                fallback_responses = await query_models_parallel(
                    fallback_to_use,
                    messages,
                    timeout
                )

                for model, response in fallback_responses.items():
                    if response is not None:
                        successful_responses[model] = response
                        logger.info(f"✓ Fallback success: {model}")

        # Final check
        if len(successful_responses) < self.min_responses_required:
            logger.error(
                f"Only got {len(successful_responses)} responses, "
                f"needed {self.min_responses_required}"
            )

        return successful_responses

    async def execute_with_retry(
        self,
        model: str,
        messages: List[Dict[str, str]],
        timeout: float = 30.0
    ) -> Optional[Dict[str, Any]]:
        """
        Execute a query with exponential backoff retry.

        Args:
            model: Model identifier
            messages: Chat messages
            timeout: Timeout per attempt

        Returns:
            Response or None if all retries failed
        """
        for attempt in range(self.retry_attempts):
            if attempt > 0:
                delay = self.retry_delay * (2 ** (attempt - 1))
                logger.info(f"Retry {attempt} for {model} after {delay}s delay")
                await asyncio.sleep(delay)

            try:
                response = await query_model(model, messages, timeout)
                if response is not None:
                    return response
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1} for {model}: {e}")

        logger.error(f"All {self.retry_attempts} attempts failed for {model}")
        return None

    def validate_response(self, response: Dict[str, Any]) -> bool:
        """
        Validate that a response is valid and not empty.

        Args:
            response: Response dictionary

        Returns:
            True if response is valid
        """
        if not response:
            return False

        content = response.get('content', '')

        # Check for empty or error responses
        if not content or len(content.strip()) < 10:
            return False

        # Check for common error patterns
        error_patterns = [
            "error:",
            "failed to",
            "unable to",
            "rate limit",
            "quota exceeded"
        ]

        content_lower = content.lower()
        for pattern in error_patterns:
            if pattern in content_lower[:100]:  # Check first 100 chars
                return False

        return True

    def estimate_cost(self, models: List[str], estimated_tokens: int = 2000) -> float:
        """
        Estimate the cost of running queries on given models.

        Args:
            models: List of model identifiers
            estimated_tokens: Estimated total tokens (input + output)

        Returns:
            Estimated cost in USD
        """
        total_cost = 0.0
        for model in models:
            cost_per_k = MODEL_COSTS.get(model, 0.001)  # Default cost if unknown
            total_cost += (estimated_tokens / 1000) * cost_per_k

        return round(total_cost, 4)


class ErrorRecovery:
    """Handles specific error scenarios and recovery strategies."""

    @staticmethod
    def get_recovery_strategy(error: Exception) -> str:
        """
        Determine recovery strategy based on error type.

        Args:
            error: The exception that occurred

        Returns:
            Recovery strategy identifier
        """
        error_msg = str(error).lower()

        if "rate limit" in error_msg:
            return "rate_limit"
        elif "timeout" in error_msg:
            return "timeout"
        elif "api key" in error_msg or "unauthorized" in error_msg:
            return "auth_error"
        elif "quota" in error_msg or "insufficient" in error_msg:
            return "quota_exceeded"
        else:
            return "unknown"

    @staticmethod
    async def handle_rate_limit(delay: float = 5.0):
        """Handle rate limit errors with exponential backoff."""
        logger.warning(f"Rate limited, waiting {delay} seconds")
        await asyncio.sleep(delay)

    @staticmethod
    def should_use_cheaper_model(error_strategy: str) -> bool:
        """Determine if we should switch to cheaper models."""
        return error_strategy in ["quota_exceeded", "rate_limit"]


class PartialResponseHandler:
    """Handles partial responses when not all models respond."""

    @staticmethod
    def can_proceed_with_partial(
        responses: Dict[str, Any],
        min_required: int = 2
    ) -> bool:
        """
        Determine if we can proceed with partial responses.

        Args:
            responses: Dictionary of model responses
            min_required: Minimum responses needed

        Returns:
            True if we can proceed
        """
        valid_responses = sum(
            1 for r in responses.values()
            if r is not None and len(r.get('content', '')) > 10
        )
        return valid_responses >= min_required

    @staticmethod
    def adjust_stage2_for_partial(
        stage1_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Adjust Stage 2 when we have partial Stage 1 results.

        Args:
            stage1_results: Results from Stage 1

        Returns:
            Adjusted results suitable for Stage 2
        """
        if len(stage1_results) < 2:
            # Can't do meaningful ranking with < 2 responses
            logger.warning("Too few responses for ranking, skipping Stage 2")
            return []

        # Ensure all results have required fields
        validated_results = []
        for result in stage1_results:
            if result.get('model') and result.get('response'):
                validated_results.append(result)

        return validated_results