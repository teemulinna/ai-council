"""Cost tracking and budget management for LLM queries."""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from .config import MODEL_COSTS, MODEL_PRICING, DEFAULT_MAX_BUDGET

logger = logging.getLogger(__name__)


class CostTracker:
    """Track costs and enforce budget limits."""

    def __init__(self, budget_limit: float = DEFAULT_MAX_BUDGET):
        """
        Initialize cost tracker.

        Args:
            budget_limit: Maximum budget in USD
        """
        self.budget_limit = budget_limit
        self.current_spend = 0.0
        self.cost_history = []
        self.model_usage = {}

    def estimate_cost(
        self,
        models: List[str],
        estimated_tokens: int = 2000
    ) -> float:
        """
        Estimate cost for querying multiple models.

        Args:
            models: List of model identifiers
            estimated_tokens: Estimated total tokens

        Returns:
            Estimated cost in USD
        """
        total_cost = 0.0

        for model in models:
            cost_per_k = MODEL_COSTS.get(model, 0.001)  # Default if unknown
            model_cost = (estimated_tokens / 1000) * cost_per_k
            total_cost += model_cost

        return round(total_cost, 4)

    def can_proceed(self, estimated_cost: float) -> bool:
        """
        Check if we can proceed within budget.

        Args:
            estimated_cost: Estimated cost for operation

        Returns:
            True if within budget
        """
        would_exceed = (self.current_spend + estimated_cost) > self.budget_limit

        if would_exceed:
            logger.warning(
                f"Budget limit would be exceeded. "
                f"Current: ${self.current_spend:.2f}, "
                f"Estimated: ${estimated_cost:.2f}, "
                f"Limit: ${self.budget_limit:.2f}"
            )

        return not would_exceed

    def track_usage(
        self,
        model: str,
        tokens: int,
        response_time: float = 0.0,
        input_tokens: int = 0,
        output_tokens: int = 0
    ) -> Dict:
        """
        Track actual usage and cost with detailed breakdown.

        Args:
            model: Model identifier
            tokens: Total tokens used (legacy)
            response_time: Response time in seconds
            input_tokens: Input/prompt tokens
            output_tokens: Output/completion tokens

        Returns:
            Dict with cost breakdown
        """
        # Use detailed pricing if available
        if model in MODEL_PRICING and (input_tokens > 0 or output_tokens > 0):
            pricing = MODEL_PRICING[model]
            input_cost = (input_tokens / 1_000_000) * pricing["input"]
            output_cost = (output_tokens / 1_000_000) * pricing["output"]
            cost = input_cost + output_cost
        else:
            # Fallback to legacy pricing
            cost_per_k = MODEL_COSTS.get(model, 0.001)
            cost = (tokens / 1000) * cost_per_k
            input_cost = cost * 0.3  # Estimate
            output_cost = cost * 0.7

        self.current_spend += cost

        # Detailed cost info
        cost_info = {
            "model": model,
            "input_tokens": input_tokens or int(tokens * 0.3),
            "output_tokens": output_tokens or int(tokens * 0.7),
            "total_tokens": tokens or (input_tokens + output_tokens),
            "input_cost": round(input_cost, 6),
            "output_cost": round(output_cost, 6),
            "total_cost": round(cost, 6),
            "response_time": response_time
        }

        # Track history
        self.cost_history.append({
            "timestamp": datetime.now().isoformat(),
            **cost_info
        })

        # Track per-model usage
        if model not in self.model_usage:
            self.model_usage[model] = {
                "count": 0,
                "total_tokens": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_cost": 0.0
            }

        self.model_usage[model]["count"] += 1
        self.model_usage[model]["total_tokens"] += cost_info["total_tokens"]
        self.model_usage[model]["input_tokens"] += cost_info["input_tokens"]
        self.model_usage[model]["output_tokens"] += cost_info["output_tokens"]
        self.model_usage[model]["total_cost"] += cost

        logger.info(
            f"Tracked usage: {model} - {cost_info['total_tokens']} tokens = ${cost:.6f} "
            f"(Total: ${self.current_spend:.4f})"
        )

        return cost_info

    def get_remaining_budget(self) -> float:
        """Get remaining budget."""
        return max(0, self.budget_limit - self.current_spend)

    def get_usage_summary(self) -> Dict:
        """
        Get usage summary and statistics.

        Returns:
            Dictionary with usage statistics
        """
        return {
            "current_spend": round(self.current_spend, 4),
            "budget_limit": self.budget_limit,
            "remaining_budget": round(self.get_remaining_budget(), 4),
            "budget_used_percent": round(
                (self.current_spend / self.budget_limit * 100) if self.budget_limit > 0 else 0,
                2
            ),
            "queries_count": len(self.cost_history),
            "model_usage": self.model_usage,
            "average_cost_per_query": round(
                self.current_spend / len(self.cost_history) if self.cost_history else 0,
                4
            )
        }

    def reset(self):
        """Reset cost tracking (new conversation/session)."""
        self.current_spend = 0.0
        self.cost_history = []
        self.model_usage = {}
        logger.info("Cost tracker reset")


class SmartModelSelector:
    """Select appropriate models based on query complexity and budget."""

    COMPLEXITY_KEYWORDS = {
        "simple": [
            "what is", "when is", "who is", "where is",
            "define", "meaning of", "capital of", "how many"
        ],
        "medium": [
            "explain", "describe", "compare", "analyze",
            "summarize", "list", "outline", "discuss"
        ],
        "complex": [
            "evaluate", "critique", "synthesize", "design",
            "architect", "optimize", "prove", "derive",
            "implement", "debug", "refactor"
        ]
    }

    MODEL_TIERS = {
        "budget": [
            "deepseek/deepseek-chat",
            "anthropic/claude-3.5-haiku",
            "openai/gpt-4o-mini",
            "google/gemini-1.5-flash"
        ],
        "standard": [
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            "google/gemini-1.5-pro",
            "deepseek/deepseek-chat"
        ],
        "premium": [
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-opus",
            "openai/gpt-4o",
            "google/gemini-1.5-pro"
        ]
    }

    @classmethod
    def assess_complexity(cls, query: str) -> str:
        """
        Assess query complexity.

        Args:
            query: User query

        Returns:
            Complexity level: 'simple', 'medium', or 'complex'
        """
        query_lower = query.lower()

        # Check for complex indicators
        for keyword in cls.COMPLEXITY_KEYWORDS["complex"]:
            if keyword in query_lower:
                return "complex"

        # Check for simple indicators
        for keyword in cls.COMPLEXITY_KEYWORDS["simple"]:
            if keyword in query_lower:
                return "simple"

        # Default to medium
        return "medium"

    @classmethod
    def select_models(
        cls,
        query: str,
        budget_remaining: float,
        force_tier: Optional[str] = None
    ) -> List[str]:
        """
        Select appropriate models for the query.

        Args:
            query: User query
            budget_remaining: Remaining budget
            force_tier: Force specific tier (budget/standard/premium)

        Returns:
            List of selected models
        """
        if force_tier:
            tier = force_tier
        else:
            complexity = cls.assess_complexity(query)

            # Map complexity to tier based on budget
            if budget_remaining < 0.5:
                tier = "budget"
            elif complexity == "simple":
                tier = "budget"
            elif complexity == "medium":
                tier = "standard"
            else:
                tier = "premium"

            # Downgrade if budget is tight
            if budget_remaining < 1.0 and tier == "premium":
                tier = "standard"

        selected = cls.MODEL_TIERS[tier]

        logger.info(
            f"Selected {tier} tier models for query "
            f"(budget: ${budget_remaining:.2f}): {selected}"
        )

        return selected

    @classmethod
    def get_model_info(cls, model: str) -> Dict:
        """
        Get information about a model.

        Args:
            model: Model identifier

        Returns:
            Model information dictionary
        """
        cost = MODEL_COSTS.get(model, 0.001)

        # Determine tier
        tier = "unknown"
        for tier_name, models in cls.MODEL_TIERS.items():
            if model in models:
                tier = tier_name
                break

        return {
            "model": model,
            "cost_per_1k_tokens": cost,
            "tier": tier,
            "provider": model.split("/")[0] if "/" in model else "unknown"
        }