"""Council preset configurations for quick selection."""

from typing import List, Dict, Any
from dataclasses import dataclass, asdict


@dataclass
class CouncilPreset:
    """Defines a preset council configuration."""
    id: str
    name: str
    description: str
    icon: str
    agent_count: int
    roles: List[str]  # Role names in priority order
    mode: str  # balanced, specialized, diverse
    estimated_cost: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


# Predefined council presets - Simplified Nov 2025
# Cost estimates based on ~1K input, ~2K output tokens per model across 3 stages
COUNCIL_PRESETS = [
    CouncilPreset(
        id="fast",
        name="Fast",
        description="Quick responses using budget-friendly models. Best for simple questions.",
        icon="⚡",
        agent_count=3,
        roles=[
            "primary_responder",
            "fact_checker",
            "practical_advisor"
        ],
        mode="budget",
        estimated_cost=0.01  # ~$0.01 with DeepSeek, Haiku, GPT-4o-mini
    ),
    CouncilPreset(
        id="balanced",
        name="Balanced",
        description="Mix of frontier models for well-rounded analysis. Default choice.",
        icon="⚖️",
        agent_count=5,
        roles=[
            "primary_responder",
            "devils_advocate",
            "fact_checker",
            "creative_thinker",
            "practical_advisor"
        ],
        mode="balanced",
        estimated_cost=0.12  # ~$0.12 with Claude 3.5, GPT-4o, Gemini, DeepSeek, Llama
    ),
    CouncilPreset(
        id="deep",
        name="Deep Analysis",
        description="Premium models with comprehensive coverage for complex questions.",
        icon="🔍",
        agent_count=7,
        roles=[
            "primary_responder",
            "devils_advocate",
            "fact_checker",
            "creative_thinker",
            "practical_advisor",
            "domain_expert",
            "synthesizer"
        ],
        mode="premium",
        estimated_cost=0.35  # ~$0.35 with premium tier models
    ),
]


def get_all_presets() -> List[CouncilPreset]:
    """Get all available council presets."""
    return COUNCIL_PRESETS


def get_preset_by_id(preset_id: str) -> CouncilPreset | None:
    """Get a specific preset by ID."""
    for preset in COUNCIL_PRESETS:
        if preset.id == preset_id:
            return preset
    return None


def get_default_preset() -> CouncilPreset:
    """Get the default preset (balanced)."""
    return get_preset_by_id("balanced") or COUNCIL_PRESETS[0]


def compose_from_preset(preset: CouncilPreset) -> Dict[str, Any]:
    """Compose a council based on a preset configuration."""
    from .agent_roles import CouncilComposer

    composer = CouncilComposer()

    # Create council with preset specifications
    council = composer.compose(
        agent_count=preset.agent_count,
        models=None,  # Auto-select models
        mode=preset.mode
    )

    # Add preset metadata
    council["preset_id"] = preset.id
    council["preset_name"] = preset.name

    return council
