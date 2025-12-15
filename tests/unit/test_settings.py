"""Unit tests for settings management - TDD approach."""

import pytest
from backend.settings import (
    UserSettings,
    ConversationSettings,
    SettingsManager,
    get_default_settings
)


class TestUserSettings:
    """Test user settings model and validation."""

    def test_default_settings_structure(self):
        """Test that default settings have all required fields."""
        settings = get_default_settings()

        assert "models" in settings
        assert "budget" in settings
        assert "cache_enabled" in settings
        assert "process" in settings
        assert "ui" in settings

    def test_user_settings_validation(self):
        """Test that settings are validated correctly."""
        settings = UserSettings(
            default_models=[
                "anthropic/claude-3-opus-20240229",
                "openai/gpt-4-turbo"
            ],
            default_agent_count=3,
            max_budget=10.0,
            cache_enabled=True
        )

        assert settings.default_agent_count >= 2  # Minimum agents
        assert settings.max_budget > 0
        assert len(settings.default_models) > 0

    def test_invalid_settings_raise_errors(self):
        """Test that invalid settings are rejected."""
        # Too few agents
        with pytest.raises(ValueError, match="minimum"):
            UserSettings(default_agent_count=1)

        # Negative budget
        with pytest.raises(ValueError, match="budget"):
            UserSettings(max_budget=-1)

        # Empty models list
        with pytest.raises(ValueError, match="model"):
            UserSettings(default_models=[])

    def test_process_settings_structure(self):
        """Test process configuration settings."""
        settings = UserSettings()

        assert hasattr(settings, "process_rounds")
        assert hasattr(settings, "enable_debate")
        assert hasattr(settings, "convergence_threshold")

        assert settings.process_rounds >= 1
        assert isinstance(settings.enable_debate, bool)
        assert 0 <= settings.convergence_threshold <= 1


class TestConversationSettings:
    """Test conversation-specific settings."""

    def test_conversation_inherits_defaults(self):
        """Test that conversation settings inherit from user defaults."""
        user_settings = UserSettings(default_agent_count=5)

        conv_settings = ConversationSettings.from_user_settings(user_settings)

        assert conv_settings.agent_count == 5

    def test_conversation_can_override_defaults(self):
        """Test that conversation settings can override defaults."""
        user_settings = UserSettings(default_agent_count=5)

        conv_settings = ConversationSettings.from_user_settings(
            user_settings,
            overrides={"agent_count": 3}
        )

        assert conv_settings.agent_count == 3

    def test_conversation_settings_persist(self):
        """Test that conversation settings are saved with conversation."""
        conv_settings = ConversationSettings(
            conversation_id="test-123",
            agent_count=4,
            models=["model1", "model2"],
            process_rounds=2
        )

        # Serialize
        data = conv_settings.to_dict()

        # Deserialize
        restored = ConversationSettings.from_dict(data)

        assert restored.conversation_id == conv_settings.conversation_id
        assert restored.agent_count == conv_settings.agent_count
        assert restored.models == conv_settings.models


class TestSettingsManager:
    """Test settings management operations."""

    def test_get_user_settings(self):
        """Test retrieving user settings."""
        manager = SettingsManager()

        settings = manager.get_user_settings("user-123")

        assert isinstance(settings, UserSettings)

    def test_save_user_settings(self):
        """Test saving user settings."""
        manager = SettingsManager()

        settings = UserSettings(default_agent_count=7)
        manager.save_user_settings("user-123", settings)

        # Retrieve and verify
        retrieved = manager.get_user_settings("user-123")
        assert retrieved.default_agent_count == 7

    def test_update_partial_settings(self):
        """Test updating only specific settings."""
        manager = SettingsManager()

        # Initial settings
        settings = UserSettings(default_agent_count=3, max_budget=10.0)
        manager.save_user_settings("user-123", settings)

        # Update only agent count
        manager.update_user_settings("user-123", {"default_agent_count": 5})

        # Verify
        updated = manager.get_user_settings("user-123")
        assert updated.default_agent_count == 5
        assert updated.max_budget == 10.0  # Unchanged

    def test_settings_persistence(self):
        """Test that settings persist across sessions."""
        manager = SettingsManager()

        settings = UserSettings(default_agent_count=6)
        manager.save_user_settings("user-123", settings)

        # Simulate new session
        new_manager = SettingsManager()
        retrieved = new_manager.get_user_settings("user-123")

        assert retrieved.default_agent_count == 6

    def test_conversation_specific_settings(self):
        """Test managing conversation-specific settings."""
        manager = SettingsManager()

        conv_settings = ConversationSettings(
            conversation_id="conv-123",
            agent_count=4
        )

        manager.save_conversation_settings("conv-123", conv_settings)

        retrieved = manager.get_conversation_settings("conv-123")
        assert retrieved.agent_count == 4

    def test_settings_export_import(self):
        """Test exporting and importing settings."""
        manager = SettingsManager()

        settings = UserSettings(
            default_agent_count=5,
            default_models=["model1", "model2"]
        )

        # Export
        exported = manager.export_settings("user-123", settings)
        assert isinstance(exported, dict)

        # Import
        manager.import_settings("user-456", exported)
        retrieved = manager.get_user_settings("user-456")

        assert retrieved.default_agent_count == 5
        assert retrieved.default_models == ["model1", "model2"]


class TestProcessSettings:
    """Test process configuration settings."""

    def test_single_round_mode(self):
        """Test single round (standard) mode."""
        settings = UserSettings(process_rounds=1, enable_debate=False)

        assert settings.process_rounds == 1
        assert not settings.enable_debate

    def test_multi_round_debate_mode(self):
        """Test multi-round debate mode."""
        settings = UserSettings(
            process_rounds=3,
            enable_debate=True,
            convergence_threshold=0.8
        )

        assert settings.process_rounds == 3
        assert settings.enable_debate
        assert settings.convergence_threshold == 0.8

    def test_convergence_detection_settings(self):
        """Test convergence detection configuration."""
        settings = UserSettings(
            enable_debate=True,
            convergence_threshold=0.9,
            max_rounds_without_convergence=5
        )

        assert settings.convergence_threshold > 0
        assert settings.max_rounds_without_convergence > 0

    def test_timeout_settings_per_round(self):
        """Test that timeout settings scale with rounds."""
        settings = UserSettings(
            process_rounds=3,
            timeout_per_round=60
        )

        total_timeout = settings.calculate_total_timeout()
        assert total_timeout >= 180  # 3 rounds * 60s


class TestUISettings:
    """Test UI-related settings."""

    def test_display_preferences(self):
        """Test UI display preferences."""
        settings = UserSettings()

        assert hasattr(settings, "show_all_responses")
        assert hasattr(settings, "show_rankings")
        assert hasattr(settings, "show_cost_breakdown")

    def test_theme_settings(self):
        """Test theme and appearance settings."""
        settings = UserSettings(
            theme="dark",
            compact_mode=True
        )

        assert settings.theme in ["light", "dark", "auto"]
        assert isinstance(settings.compact_mode, bool)