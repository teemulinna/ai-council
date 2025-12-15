"""Unit tests for agent role system - TDD approach."""

import pytest
from backend.agent_roles import (
    AgentRole,
    RoleAssigner,
    CouncilComposer,
    get_default_roles,
    assign_role_to_model
)


class TestAgentRole:
    """Test agent role definitions and behavior."""

    def test_role_has_required_attributes(self):
        """Test that agent role has all required attributes."""
        role = AgentRole(
            name="primary_responder",
            display_name="Primary Responder",
            description="Provides the main comprehensive answer",
            prompt_modifier="You are the primary responder. Provide a thorough, well-structured answer.",
            priority=1
        )

        assert role.name == "primary_responder"
        assert role.display_name == "Primary Responder"
        assert role.description
        assert role.prompt_modifier
        assert role.priority == 1

    def test_default_roles_exist(self):
        """Test that default roles are properly defined."""
        roles = get_default_roles()

        assert len(roles) >= 5
        role_names = [r.name for r in roles]

        # Essential roles should exist
        assert "primary_responder" in role_names
        assert "devils_advocate" in role_names
        assert "fact_checker" in role_names
        assert "synthesizer" in role_names
        assert "creative_thinker" in role_names

    def test_roles_have_unique_priorities(self):
        """Test that roles have distinct priority levels."""
        roles = get_default_roles()
        priorities = [r.priority for r in roles]

        # Primary responder should have highest priority
        primary = next(r for r in roles if r.name == "primary_responder")
        assert primary.priority == 1

        # Synthesizer should have high priority (near end)
        synthesizer = next(r for r in roles if r.name == "synthesizer")
        assert synthesizer.priority >= len(roles) - 2  # Among the last few


class TestRoleAssigner:
    """Test intelligent role assignment to models."""

    def test_assign_roles_to_models(self):
        """Test assigning roles to a list of models."""
        models = [
            "anthropic/claude-3-opus-20240229",
            "openai/gpt-4-turbo",
            "google/gemini-pro"
        ]

        assigner = RoleAssigner()
        assignments = assigner.assign_roles(models)

        assert len(assignments) == len(models)
        assert all("model" in a and "role" in a for a in assignments)

        # First model should get primary responder role
        assert assignments[0]["role"].name == "primary_responder"

    def test_more_models_than_roles(self):
        """Test behavior when there are more models than predefined roles."""
        models = [f"model-{i}" for i in range(10)]  # 10 models

        assigner = RoleAssigner()
        assignments = assigner.assign_roles(models)

        assert len(assignments) == len(models)

        # Extra models should get "additional_perspective" role
        role_names = [a["role"].name for a in assignments]
        assert "additional_perspective" in role_names

    def test_intelligent_role_matching(self):
        """Test that roles are matched intelligently to model capabilities."""
        # Claude Opus is best for primary responses
        models = ["anthropic/claude-3-opus-20240229", "openai/gpt-3.5-turbo"]

        assigner = RoleAssigner()
        assignments = assigner.assign_roles(models, smart_matching=True)

        # Opus should get primary role
        opus_assignment = next(a for a in assignments if "opus" in a["model"])
        assert opus_assignment["role"].name == "primary_responder"

    def test_custom_role_assignment(self):
        """Test assigning specific custom roles."""
        models = ["model-1", "model-2"]
        custom_roles = [
            AgentRole("custom1", "Custom 1", "Description", "Prompt", 1),
            AgentRole("custom2", "Custom 2", "Description", "Prompt", 2)
        ]

        assigner = RoleAssigner()
        assignments = assigner.assign_roles(models, custom_roles=custom_roles)

        assert assignments[0]["role"].name == "custom1"
        assert assignments[1]["role"].name == "custom2"


class TestCouncilComposer:
    """Test council composition with configurable agents."""

    def test_create_council_with_agent_count(self):
        """Test creating council with specific number of agents."""
        composer = CouncilComposer()

        # Request 3 agents
        council = composer.compose(agent_count=3)

        assert len(council["agents"]) == 3
        assert all("model" in a and "role" in a for a in council["agents"])

    def test_create_council_with_specific_models(self):
        """Test creating council with user-selected models."""
        composer = CouncilComposer()

        models = [
            "anthropic/claude-3-sonnet-20240229",
            "openai/gpt-4-turbo"
        ]

        council = composer.compose(models=models)

        assert len(council["agents"]) == 2
        council_models = [a["model"] for a in council["agents"]]
        assert set(council_models) == set(models)

    def test_council_includes_metadata(self):
        """Test that council composition includes useful metadata."""
        composer = CouncilComposer()
        council = composer.compose(agent_count=5)

        assert "agents" in council
        assert "topology" in council
        assert "estimated_cost" in council
        assert "roles_summary" in council

    def test_balance_cost_and_quality(self):
        """Test that composer balances cost and quality."""
        composer = CouncilComposer()

        # Budget mode should use cheaper models
        budget_council = composer.compose(
            agent_count=5,
            mode="budget"
        )

        # Premium mode should use better models
        premium_council = composer.compose(
            agent_count=5,
            mode="premium"
        )

        assert budget_council["estimated_cost"] < premium_council["estimated_cost"]

    def test_add_agent_to_existing_council(self):
        """Test dynamically adding an agent to council."""
        composer = CouncilComposer()

        # Start with 3 agents
        council = composer.compose(agent_count=3)
        initial_count = len(council["agents"])

        # Add one more
        updated_council = composer.add_agent(
            council,
            model="google/gemini-pro"
        )

        assert len(updated_council["agents"]) == initial_count + 1

        # New agent should have appropriate role
        new_agent = updated_council["agents"][-1]
        assert new_agent["model"] == "google/gemini-pro"
        assert new_agent["role"].name != "primary_responder"  # Not duplicate primary

    def test_remove_agent_from_council(self):
        """Test removing an agent while maintaining minimum."""
        composer = CouncilComposer()

        council = composer.compose(agent_count=5)

        # Can remove when above minimum
        updated = composer.remove_agent(council, agent_index=2)
        assert len(updated["agents"]) == 4

        # Cannot remove when at minimum
        minimal_council = composer.compose(agent_count=2)
        with pytest.raises(ValueError, match="[Mm]inimum"):
            composer.remove_agent(minimal_council, agent_index=0)


class TestRoleSpecificBehavior:
    """Test that roles modify agent behavior correctly."""

    def test_devils_advocate_challenges_consensus(self):
        """Test that devil's advocate role encourages critical thinking."""
        role = next(r for r in get_default_roles() if r.name == "devils_advocate")

        # Prompt modifier should encourage challenging
        assert "challenge" in role.prompt_modifier.lower() or \
               "alternative" in role.prompt_modifier.lower() or \
               "devil" in role.prompt_modifier.lower()

    def test_fact_checker_focuses_on_accuracy(self):
        """Test that fact checker role emphasizes verification."""
        role = next(r for r in get_default_roles() if r.name == "fact_checker")

        assert "fact" in role.prompt_modifier.lower() or \
               "verify" in role.prompt_modifier.lower() or \
               "accurate" in role.prompt_modifier.lower()

    def test_creative_thinker_encourages_innovation(self):
        """Test that creative thinker role promotes novel ideas."""
        role = next(r for r in get_default_roles() if r.name == "creative_thinker")

        assert "creative" in role.prompt_modifier.lower() or \
               "innovative" in role.prompt_modifier.lower() or \
               "unconventional" in role.prompt_modifier.lower()