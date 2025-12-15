"""Agent role system for intelligent council composition."""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from .config import COUNCIL_MODELS, FALLBACK_MODELS, MODEL_COSTS, BUDGET_MODELS, PREMIUM_MODELS, MODEL_PRICING

logger = logging.getLogger(__name__)


@dataclass
class AgentRole:
    """Defines a specific role for an agent in the council."""
    name: str
    display_name: str
    description: str
    prompt_modifier: str
    priority: int  # Lower number = higher priority

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


def get_default_roles() -> List[AgentRole]:
    """Get predefined agent roles."""
    return [
        AgentRole(
            name="primary_responder",
            display_name="Primary Responder",
            description="Provides the main comprehensive answer with thorough analysis",
            prompt_modifier="You are the PRIMARY RESPONDER. Provide a comprehensive, well-structured answer that covers all aspects of the question. Be thorough and authoritative.",
            priority=1
        ),
        AgentRole(
            name="devils_advocate",
            display_name="Devil's Advocate",
            description="Challenges assumptions and explores alternative viewpoints",
            prompt_modifier="You are the DEVIL'S ADVOCATE. Challenge common assumptions, explore counter-arguments, and present alternative perspectives. Question what others might take for granted.",
            priority=2
        ),
        AgentRole(
            name="fact_checker",
            display_name="Fact Checker",
            description="Verifies accuracy and provides evidence-based corrections",
            prompt_modifier="You are the FACT CHECKER. Verify the accuracy of claims, cite evidence where possible, and point out any factual errors or misconceptions. Focus on precision and reliability.",
            priority=3
        ),
        AgentRole(
            name="creative_thinker",
            display_name="Creative Thinker",
            description="Brings innovative and unconventional perspectives",
            prompt_modifier="You are the CREATIVE THINKER. Approach the question from unconventional angles, suggest innovative solutions, and think outside the box. Don't be afraid to be bold.",
            priority=4
        ),
        AgentRole(
            name="practical_advisor",
            display_name="Practical Advisor",
            description="Focuses on real-world application and actionable insights",
            prompt_modifier="You are the PRACTICAL ADVISOR. Focus on real-world applications, concrete examples, and actionable advice. Make your response useful and implementable.",
            priority=5
        ),
        AgentRole(
            name="domain_expert",
            display_name="Domain Expert",
            description="Provides deep specialized knowledge on relevant topics",
            prompt_modifier="You are the DOMAIN EXPERT. Provide deep, specialized knowledge on this topic. Share technical details, industry best practices, and expert-level insights.",
            priority=6
        ),
        AgentRole(
            name="synthesizer",
            display_name="Synthesizer",
            description="Combines insights from all perspectives into coherent conclusions",
            prompt_modifier="You are the SYNTHESIZER. Review all other responses, identify common themes, reconcile different viewpoints, and create a unified, balanced conclusion.",
            priority=7
        ),
        AgentRole(
            name="additional_perspective",
            display_name="Additional Perspective",
            description="Provides supplementary viewpoint to enrich the discussion",
            prompt_modifier="You are an ADDITIONAL PERSPECTIVE. Contribute a unique viewpoint that complements the other responses. Add depth and nuance to the discussion.",
            priority=8
        ),
    ]


class RoleAssigner:
    """Assigns roles to models intelligently."""

    def __init__(self):
        self.default_roles = get_default_roles()

        # Model capability scoring (higher is better) - Updated Nov 2025
        self.model_capabilities = {
            # Anthropic
            "anthropic/claude-3.5-sonnet": {
                "reasoning": 0.95,
                "creativity": 0.90,
                "accuracy": 0.94,
            },
            "anthropic/claude-3.5-haiku": {
                "reasoning": 0.85,
                "creativity": 0.82,
                "accuracy": 0.86,
            },
            "anthropic/claude-3-opus": {
                "reasoning": 0.96,
                "creativity": 0.88,
                "accuracy": 0.95,
            },
            # OpenAI
            "openai/gpt-4o": {
                "reasoning": 0.94,
                "creativity": 0.92,
                "accuracy": 0.93,
            },
            "openai/gpt-4o-mini": {
                "reasoning": 0.85,
                "creativity": 0.84,
                "accuracy": 0.85,
            },
            "openai/gpt-4-turbo": {
                "reasoning": 0.92,
                "creativity": 0.90,
                "accuracy": 0.91,
            },
            # Google
            "google/gemini-1.5-pro": {
                "reasoning": 0.91,
                "creativity": 0.86,
                "accuracy": 0.90,
            },
            "google/gemini-1.5-flash": {
                "reasoning": 0.83,
                "creativity": 0.80,
                "accuracy": 0.84,
            },
            # DeepSeek
            "deepseek/deepseek-chat": {
                "reasoning": 0.90,
                "creativity": 0.85,
                "accuracy": 0.89,
            },
            # Meta
            "meta-llama/llama-3.1-70b-instruct": {
                "reasoning": 0.88,
                "creativity": 0.86,
                "accuracy": 0.87,
            },
            "meta-llama/llama-3.1-8b-instruct": {
                "reasoning": 0.78,
                "creativity": 0.76,
                "accuracy": 0.77,
            },
        }

    def assign_roles(
        self,
        models: List[str],
        custom_roles: Optional[List[AgentRole]] = None,
        smart_matching: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Assign roles to models.

        Args:
            models: List of model identifiers
            custom_roles: Optional custom roles to use instead of defaults
            smart_matching: Whether to match roles to model capabilities

        Returns:
            List of assignments with model and role
        """
        roles = custom_roles or self.default_roles.copy()
        assignments = []

        if smart_matching:
            # Sort models by capability for primary roles
            sorted_models = self._sort_by_capability(models)
        else:
            sorted_models = models

        # Assign roles in priority order
        for i, model in enumerate(sorted_models):
            if i < len(roles):
                role = roles[i]
            else:
                # Use "additional perspective" for extra models
                role = AgentRole(
                    name=f"additional_perspective_{i}",
                    display_name=f"Additional Perspective {i - len(roles) + 1}",
                    description="Provides supplementary viewpoint",
                    prompt_modifier="Provide a unique viewpoint that complements other responses.",
                    priority=8 + i
                )

            assignments.append({
                "model": model,
                "role": role,
                "capabilities": self.model_capabilities.get(model, {})
            })

        logger.info(f"Assigned {len(assignments)} roles to models")
        return assignments

    def _sort_by_capability(self, models: List[str]) -> List[str]:
        """Sort models by their capabilities (best first)."""
        def score_model(model: str) -> float:
            caps = self.model_capabilities.get(model, {"reasoning": 0.5})
            # Weighted score: reasoning most important for primary role
            return caps.get("reasoning", 0.5) * 0.5 + \
                   caps.get("accuracy", 0.5) * 0.3 + \
                   caps.get("creativity", 0.5) * 0.2

        return sorted(models, key=score_model, reverse=True)


class CouncilComposer:
    """Composes councils with configurable agents and roles."""

    def __init__(self):
        self.role_assigner = RoleAssigner()
        self.min_agents = 2
        self.max_agents = 10

    def compose(
        self,
        agent_count: Optional[int] = None,
        models: Optional[List[str]] = None,
        mode: str = "balanced"  # "budget", "balanced", or "premium"
    ) -> Dict[str, Any]:
        """
        Compose a council configuration.

        Args:
            agent_count: Number of agents (if models not specified)
            models: Specific models to use
            mode: Cost/quality tradeoff mode

        Returns:
            Council configuration with agents, roles, and metadata
        """
        if models:
            # Use user-specified models
            selected_models = models
        elif agent_count:
            # Select models based on count and mode
            selected_models = self._select_models_for_mode(agent_count, mode)
        else:
            # Use default configuration
            selected_models = COUNCIL_MODELS[:5]

        # Assign roles
        assignments = self.role_assigner.assign_roles(selected_models)

        # Calculate metadata
        estimated_cost = self._estimate_cost(selected_models)
        topology = self._determine_topology(len(selected_models))

        council = {
            "agents": assignments,
            "topology": topology,
            "estimated_cost": estimated_cost,
            "agent_count": len(assignments),
            "roles_summary": [a["role"].display_name for a in assignments]
        }

        logger.info(
            f"Composed council: {len(assignments)} agents, "
            f"mode={mode}, estimated_cost=${estimated_cost:.2f}"
        )

        return council

    def add_agent(
        self,
        council: Dict[str, Any],
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add an agent to existing council.

        Args:
            council: Existing council configuration
            model: Specific model to add (or auto-select)

        Returns:
            Updated council configuration
        """
        if len(council["agents"]) >= self.max_agents:
            raise ValueError(f"Maximum {self.max_agents} agents allowed")

        # Select model if not specified
        if not model:
            existing_models = [a["model"] for a in council["agents"]]
            available = [m for m in COUNCIL_MODELS if m not in existing_models]
            if not available:
                available = FALLBACK_MODELS
            model = available[0]

        # Assign appropriate role
        existing_roles = [a["role"].name for a in council["agents"]]
        available_roles = [r for r in get_default_roles()
                          if r.name not in existing_roles]

        if available_roles:
            role = available_roles[0]
        else:
            role = AgentRole(
                name=f"additional_perspective_{len(council['agents'])}",
                display_name="Additional Perspective",
                description="Supplementary viewpoint",
                prompt_modifier="Provide unique insights to complement other responses.",
                priority=10
            )

        # Add to council
        new_agent = {
            "model": model,
            "role": role,
            "capabilities": self.role_assigner.model_capabilities.get(model, {})
        }

        council["agents"].append(new_agent)
        council["agent_count"] = len(council["agents"])
        council["roles_summary"].append(role.display_name)

        logger.info(f"Added agent: {model} as {role.display_name}")

        return council

    def remove_agent(
        self,
        council: Dict[str, Any],
        agent_index: int
    ) -> Dict[str, Any]:
        """
        Remove an agent from council.

        Args:
            council: Existing council configuration
            agent_index: Index of agent to remove

        Returns:
            Updated council configuration
        """
        if len(council["agents"]) <= self.min_agents:
            raise ValueError(f"Minimum {self.min_agents} agents required")

        if agent_index < 0 or agent_index >= len(council["agents"]):
            raise ValueError(f"Invalid agent index: {agent_index}")

        removed = council["agents"].pop(agent_index)
        council["agent_count"] = len(council["agents"])
        council["roles_summary"] = [a["role"].display_name for a in council["agents"]]

        logger.info(f"Removed agent: {removed['model']}")

        return council

    def _select_models_for_mode(
        self,
        count: int,
        mode: str
    ) -> List[str]:
        """Select models based on count and mode."""
        if mode == "budget":
            pool = BUDGET_MODELS
        elif mode == "premium":
            pool = PREMIUM_MODELS
        else:  # balanced
            pool = COUNCIL_MODELS

        # Select requested number, cycling if needed
        selected = []
        for i in range(count):
            selected.append(pool[i % len(pool)])
        return selected

    def _estimate_cost(self, models: List[str]) -> float:
        """Estimate cost for a set of models."""
        total = 0.0
        for model in models:
            # Assume average query uses 2000 tokens
            cost_per_k = MODEL_COSTS.get(model, 0.001)
            total += (2000 / 1000) * cost_per_k

        # Multiply by 3 for all stages
        return round(total * 3, 2)

    def _determine_topology(self, agent_count: int) -> str:
        """Determine optimal topology based on agent count."""
        if agent_count <= 3:
            return "ring"  # Simple circular
        elif agent_count <= 5:
            return "star"  # Centralized with synthesizer
        else:
            return "mesh"  # Full peer-to-peer


def assign_role_to_model(model: str, role_name: str) -> Dict[str, Any]:
    """Helper to assign a specific role to a model."""
    roles = get_default_roles()
    role = next((r for r in roles if r.name == role_name), None)

    if not role:
        raise ValueError(f"Unknown role: {role_name}")

    return {
        "model": model,
        "role": role
    }


def get_available_models() -> Dict[str, List[str]]:
    """Get available models grouped by tier (premium, standard, budget)."""
    all_models = list(set(COUNCIL_MODELS + FALLBACK_MODELS))

    # Categorize by cost
    premium = []
    standard = []
    budget = []

    for model in all_models:
        cost = MODEL_COSTS.get(model, 0.001)
        if cost >= 0.01:  # Premium: >= $0.01 per 1K tokens
            premium.append(model)
        elif cost >= 0.002:  # Standard: >= $0.002 per 1K tokens
            standard.append(model)
        else:  # Budget: < $0.002 per 1K tokens
            budget.append(model)

    return {
        "premium": sorted(premium),
        "standard": sorted(standard),
        "budget": sorted(budget)
    }