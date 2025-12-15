"""Unit tests for multi-turn conversations - TDD approach."""

import pytest
from backend.multi_turn import (
    ConversationThread,
    TurnManager,
    ContextBuilder,
    UserFollowUp
)


class TestConversationThread:
    """Test conversation threading and context."""

    def test_create_new_thread(self):
        """Test creating a new conversation thread."""
        thread = ConversationThread(conversation_id="conv-123")

        assert thread.conversation_id == "conv-123"
        assert thread.turn_count == 0
        assert len(thread.turns) == 0

    def test_add_council_turn(self):
        """Test adding a council response turn."""
        thread = ConversationThread("conv-123")

        council_response = {
            "user_query": "What is AI?",
            "stage1": [...],
            "stage2": [...],
            "stage3": {"response": "AI is..."}
        }

        thread.add_turn(
            turn_type="council",
            content=council_response
        )

        assert thread.turn_count == 1
        assert thread.turns[0]["type"] == "council"

    def test_add_user_followup(self):
        """Test adding a user follow-up turn."""
        thread = ConversationThread("conv-123")

        # Initial council response
        thread.add_turn("council", {"response": "Initial answer"})

        # User follow-up
        thread.add_turn(
            turn_type="user_followup",
            content="Can you elaborate on that?"
        )

        assert thread.turn_count == 2
        assert thread.turns[1]["type"] == "user_followup"

    def test_get_conversation_context(self):
        """Test getting conversation context for next turn."""
        thread = ConversationThread("conv-123")

        # Add several turns
        thread.add_turn("council", {"response": "First answer"})
        thread.add_turn("user_followup", "Follow-up question")
        thread.add_turn("council", {"response": "Second answer"})

        context = thread.get_context()

        assert "previous_turns" in context
        assert len(context["previous_turns"]) == 3
        assert context["turn_number"] == 3

    def test_context_includes_relevant_history(self):
        """Test that context includes relevant previous exchanges."""
        thread = ConversationThread("conv-123")

        thread.add_turn("council", {"response": "Python is a programming language"})
        thread.add_turn("user_followup", "What about JavaScript?")

        context = thread.get_context()

        # Should include previous Q&A for context
        assert "Python" in str(context)

    def test_context_summarization_for_long_threads(self):
        """Test that long threads are summarized to save tokens."""
        thread = ConversationThread("conv-123")

        # Add many turns
        for i in range(10):
            thread.add_turn("council", {"response": f"Answer {i}"})
            thread.add_turn("user_followup", f"Question {i+1}")

        context = thread.get_context(max_history_turns=3)

        # Should only include recent turns
        assert len(context["previous_turns"]) <= 3


class TestUserFollowUp:
    """Test user follow-up functionality."""

    def test_create_followup_from_user_input(self):
        """Test creating follow-up from user message."""
        followup = UserFollowUp(
            content="Can you explain that in simpler terms?",
            references_turn=0  # References first council response
        )

        assert followup.content
        assert followup.references_turn == 0

    def test_followup_type_detection(self):
        """Test automatic detection of follow-up type."""
        clarification = UserFollowUp("What do you mean by that?")
        assert clarification.followup_type == "clarification"

        elaboration = UserFollowUp("Can you provide more details?")
        assert elaboration.followup_type == "elaboration"

        challenge = UserFollowUp("I disagree because...")
        assert challenge.followup_type == "challenge"

        new_angle = UserFollowUp("What about approach X instead?")
        assert new_angle.followup_type == "alternative"

    def test_followup_modifies_council_prompt(self):
        """Test that follow-up modifies how council responds."""
        followup = UserFollowUp("Explain like I'm 5")

        prompt_modifier = followup.get_prompt_modifier()

        assert "simpl" in prompt_modifier.lower() or \
               "eli5" in prompt_modifier.lower()


class TestTurnManager:
    """Test turn management and orchestration."""

    def test_initialize_conversation(self):
        """Test initializing a new multi-turn conversation."""
        manager = TurnManager()

        conversation = manager.initialize_conversation("conv-123")

        assert conversation["id"] == "conv-123"
        assert conversation["turn_count"] == 0
        assert "thread" in conversation

    def test_process_initial_query(self):
        """Test processing the initial user query."""
        manager = TurnManager()

        result = manager.process_turn(
            conversation_id="conv-123",
            user_input="What is machine learning?",
            is_followup=False
        )

        assert result["turn_type"] == "initial"
        assert "council_response" in result

    @pytest.mark.asyncio
    async def test_process_followup_with_context(self):
        """Test processing a follow-up with conversation context."""
        manager = TurnManager()

        # Initial turn
        await manager.process_turn(
            "conv-123",
            "What is Python?",
            is_followup=False
        )

        # Follow-up turn
        result = await manager.process_turn(
            "conv-123",
            "How does it compare to JavaScript?",
            is_followup=True
        )

        assert result["turn_type"] == "followup"
        assert "context_used" in result
        assert result["context_used"] is True

    def test_context_building_for_followup(self):
        """Test that context is properly built for follow-ups."""
        manager = TurnManager()

        # Simulate conversation history
        thread = ConversationThread("conv-123")
        thread.add_turn("council", {
            "query": "What is AI?",
            "response": "AI is artificial intelligence..."
        })

        builder = ContextBuilder(thread)
        context = builder.build_for_followup("Tell me more about neural networks")

        assert "previous_discussion" in context
        assert "AI" in context["previous_discussion"]

    def test_followup_references_specific_agent(self):
        """Test follow-up that references a specific agent's response."""
        manager = TurnManager()

        followup = UserFollowUp(
            "I agree with Agent 2's perspective, can they elaborate?"
        )

        # Should identify which agent to emphasize
        target_agent = followup.identify_referenced_agent()
        assert target_agent is not None


class TestContextBuilder:
    """Test context building for multi-turn conversations."""

    def test_build_minimal_context(self):
        """Test building context with minimal history."""
        thread = ConversationThread("conv-123")
        thread.add_turn("council", {"response": "Answer 1"})

        builder = ContextBuilder(thread)
        context = builder.build()

        assert "turn_history" in context
        assert len(context["turn_history"]) == 1

    def test_build_context_with_summarization(self):
        """Test context building with automatic summarization."""
        thread = ConversationThread("conv-123")

        # Add many turns
        for i in range(20):
            thread.add_turn("council", {"response": f"Answer {i}"})

        builder = ContextBuilder(thread, max_context_tokens=1000)
        context = builder.build()

        # Should summarize older turns
        assert "summary" in context
        assert len(context["turn_history"]) < 20

    def test_context_prioritizes_recent_turns(self):
        """Test that recent turns are prioritized in context."""
        thread = ConversationThread("conv-123")

        for i in range(10):
            thread.add_turn("council", {"response": f"Answer {i}"})

        builder = ContextBuilder(thread, max_turns_in_context=3)
        context = builder.build()

        # Should include most recent turns
        turn_indices = [t["turn_index"] for t in context["turn_history"]]
        assert max(turn_indices) == 9  # Most recent turn

    def test_context_includes_key_facts(self):
        """Test that context extracts and includes key facts."""
        thread = ConversationThread("conv-123")

        thread.add_turn("council", {
            "response": "The capital of France is Paris. Population is 2.1 million."
        })

        builder = ContextBuilder(thread)
        context = builder.build()

        # Should extract key facts
        assert "key_facts" in context
        assert any("Paris" in fact for fact in context["key_facts"])


class TestMultiRoundDebate:
    """Test multi-round debate functionality."""

    def test_debate_mode_initialization(self):
        """Test initializing debate mode."""
        manager = TurnManager(mode="debate", rounds=3)

        assert manager.mode == "debate"
        assert manager.rounds == 3

    @pytest.mark.asyncio
    async def test_agents_respond_to_each_other(self):
        """Test that agents respond to other agents' answers."""
        manager = TurnManager(mode="debate", rounds=2)

        result = await manager.process_turn(
            "conv-123",
            "Is AI dangerous?",
            is_followup=False
        )

        # Round 1: Initial responses
        assert "round_1" in result

        # Round 2: Agents respond to each other
        assert "round_2" in result
        assert result["round_2"]["type"] == "debate"

    def test_convergence_detection(self):
        """Test detecting when agents converge on an answer."""
        responses_r1 = [
            {"response": "AI has significant risks"},
            {"response": "AI poses some dangers"},
            {"response": "AI can be dangerous"}
        ]

        responses_r2 = [
            {"response": "With proper safeguards, AI risks can be managed"},
            {"response": "AI safety measures are essential"},
            {"response": "Responsible AI development reduces dangers"}
        ]

        manager = TurnManager()

        # Should detect convergence
        converged = manager.detect_convergence(responses_r1, responses_r2)
        assert converged is True

    def test_no_convergence_continues_debate(self):
        """Test that lack of convergence continues debate."""
        responses_r1 = [
            {"response": "AI is extremely dangerous"},
            {"response": "AI is completely safe"}
        ]

        responses_r2 = [
            {"response": "AI will destroy humanity"},
            {"response": "AI will save humanity"}
        ]

        manager = TurnManager()

        converged = manager.detect_convergence(responses_r1, responses_r2)
        assert converged is False