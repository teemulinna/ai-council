"""Reasoning patterns for AI Council members.

This module provides various cognitive and reasoning patterns that can be
applied to council members to shape how they approach problems.
"""

from typing import Dict, List, Any

# Available reasoning patterns
REASONING_PATTERNS: List[Dict[str, Any]] = [
    {
        "id": "standard",
        "name": "Standard",
        "description": "Direct response without specific reasoning structure",
        "icon": "💬",
        "category": "basic",
        "best_for": ["Simple questions", "Quick responses", "Factual queries"],
        "temperature": 0.7,  # Balanced default
        "prompt_prefix": "",
        "prompt_suffix": "",
    },
    {
        "id": "chain_of_thought",
        "name": "Chain of Thought",
        "description": "Step-by-step reasoning that shows the thinking process",
        "icon": "🔗",
        "category": "reasoning",
        "best_for": ["Complex problems", "Math", "Logic puzzles", "Multi-step tasks"],
        "temperature": 0.4,  # Lower for logical precision
        "prompt_prefix": "Think through this step-by-step. Show your reasoning process clearly before arriving at your conclusion.",
        "prompt_suffix": "\n\nLet's approach this step by step:\n1.",
    },
    {
        "id": "tree_of_thoughts",
        "name": "Tree of Thoughts",
        "description": "Explores multiple reasoning paths and evaluates each branch",
        "icon": "🌳",
        "category": "reasoning",
        "best_for": ["Strategic decisions", "Complex problems with multiple solutions", "Planning"],
        "temperature": 0.6,  # Moderate for exploring alternatives
        "prompt_prefix": "Consider multiple possible approaches to this problem. For each approach, explore the implications and evaluate its merits before selecting the best path.",
        "prompt_suffix": "\n\nPossible approaches:\n- Approach A:\n- Approach B:\n- Approach C:\n\nEvaluation and best path:",
    },
    {
        "id": "react",
        "name": "ReAct",
        "description": "Reasoning and Acting - interleaves thinking with action steps",
        "icon": "⚡",
        "category": "reasoning",
        "best_for": ["Task execution", "Problem solving with actions", "Research tasks"],
        "temperature": 0.5,  # Balanced for action-oriented thinking
        "prompt_prefix": "Use the ReAct pattern: alternate between Thought (your reasoning), Action (what you would do), and Observation (what you learn). Continue until you reach a conclusion.",
        "prompt_suffix": "\n\nThought 1: Let me analyze this...\nAction 1: \nObservation 1: ",
    },
    {
        "id": "research",
        "name": "Research Mode",
        "description": "Thorough investigation with source consideration and evidence gathering",
        "icon": "🔬",
        "category": "investigation",
        "best_for": ["Fact-finding", "In-depth analysis", "Verification tasks"],
        "temperature": 0.3,  # Low for accuracy and thoroughness
        "prompt_prefix": "Approach this as a thorough research task. Consider multiple sources of information, evaluate credibility, identify gaps in knowledge, and clearly distinguish between established facts, likely conclusions, and speculation.",
        "prompt_suffix": "\n\nResearch findings:\n- Key facts:\n- Evidence:\n- Confidence level:\n- Knowledge gaps:",
    },
    {
        "id": "self_consistency",
        "name": "Self-Consistency",
        "description": "Generates multiple independent solutions and finds consensus",
        "icon": "🎯",
        "category": "reasoning",
        "best_for": ["Ambiguous problems", "Verification", "High-stakes decisions"],
        "temperature": 0.5,  # Moderate for varied independent analyses
        "prompt_prefix": "Generate three independent analyses of this problem, then identify where they agree and disagree. Your final answer should reflect the consensus while noting any significant disagreements.",
        "prompt_suffix": "\n\nAnalysis 1:\nAnalysis 2:\nAnalysis 3:\n\nConsensus:",
    },
    {
        "id": "first_principles",
        "name": "First Principles",
        "description": "Breaks down problems to fundamental truths and builds up from there",
        "icon": "🧱",
        "category": "reasoning",
        "best_for": ["Innovation", "Challenging assumptions", "Root cause analysis"],
        "temperature": 0.4,  # Lower for rigorous logical breakdown
        "prompt_prefix": "Apply first principles thinking. Break this down to its most fundamental truths, question all assumptions, and rebuild your understanding from the ground up.",
        "prompt_suffix": "\n\nFundamental truths:\n1.\nAssumptions to question:\n-\nRebuilt understanding:",
    },
    {
        "id": "socratic",
        "name": "Socratic Method",
        "description": "Uses questioning to explore ideas and uncover assumptions",
        "icon": "❓",
        "category": "analysis",
        "best_for": ["Deep exploration", "Teaching", "Uncovering hidden assumptions"],
        "temperature": 0.6,  # Moderate for probing questions
        "prompt_prefix": "Use the Socratic method. Ask probing questions to explore this topic deeply, challenge assumptions, and guide toward deeper understanding through inquiry.",
        "prompt_suffix": "\n\nKey questions to explore:\n1. What do we assume?\n2. What evidence supports this?\n3. What are the implications?",
    },
    {
        "id": "mece",
        "name": "MECE Framework",
        "description": "Mutually Exclusive, Collectively Exhaustive - structured comprehensive analysis",
        "icon": "📊",
        "category": "analysis",
        "best_for": ["Business problems", "Categorization", "Comprehensive coverage"],
        "temperature": 0.4,  # Lower for structured precision
        "prompt_prefix": "Structure your analysis using the MECE principle (Mutually Exclusive, Collectively Exhaustive). Ensure all categories are distinct with no overlap, and together cover all possibilities.",
        "prompt_suffix": "\n\nMECE Categories:\n1. [Category A - distinct area]\n2. [Category B - no overlap with A]\n3. [Category C - remaining coverage]\n\nAnalysis by category:",
    },
    {
        "id": "analogical",
        "name": "Analogical Reasoning",
        "description": "Draws parallels from similar situations or domains",
        "icon": "🔄",
        "category": "creative",
        "best_for": ["Novel problems", "Cross-domain insights", "Creative solutions"],
        "temperature": 0.8,  # Higher for creative connections
        "prompt_prefix": "Use analogical reasoning. Find relevant parallels from other domains, situations, or fields that can illuminate this problem. Draw insights from these analogies.",
        "prompt_suffix": "\n\nRelevant analogies:\n1. This is similar to...\n2. In another domain...\n\nInsights from analogies:",
    },
    {
        "id": "contrarian",
        "name": "Contrarian Analysis",
        "description": "Deliberately argues against conventional wisdom",
        "icon": "🔀",
        "category": "analysis",
        "best_for": ["Risk assessment", "Challenging groupthink", "Stress testing ideas"],
        "temperature": 0.7,  # Higher for unconventional thinking
        "prompt_prefix": "Take a contrarian view. Deliberately argue against the conventional wisdom or obvious answer. Find weaknesses, counterexamples, and alternative perspectives that others might miss.",
        "prompt_suffix": "\n\nConventional view:\nContrarian perspective:\nKey counterarguments:\nHidden risks:",
    },
    {
        "id": "pros_cons",
        "name": "Pros & Cons",
        "description": "Balanced analysis of advantages and disadvantages",
        "icon": "⚖️",
        "category": "analysis",
        "best_for": ["Decision making", "Trade-off analysis", "Balanced evaluation"],
        "temperature": 0.5,  # Balanced for fair assessment
        "prompt_prefix": "Provide a balanced analysis of pros and cons. Consider multiple stakeholder perspectives and weight the relative importance of each factor.",
        "prompt_suffix": "\n\nPros:\n1.\n2.\n\nCons:\n1.\n2.\n\nWeighted assessment:",
    },
    {
        "id": "hypothesis_driven",
        "name": "Hypothesis-Driven",
        "description": "Forms hypotheses and tests them against evidence",
        "icon": "🧪",
        "category": "investigation",
        "best_for": ["Scientific questions", "Debugging", "Root cause analysis"],
        "temperature": 0.4,  # Lower for scientific rigor
        "prompt_prefix": "Use hypothesis-driven thinking. Form clear hypotheses, identify what evidence would support or refute each, and systematically evaluate them.",
        "prompt_suffix": "\n\nHypothesis 1:\n- Evidence for:\n- Evidence against:\n\nHypothesis 2:\n- Evidence for:\n- Evidence against:\n\nMost supported hypothesis:",
    },
    {
        "id": "premortem",
        "name": "Pre-mortem Analysis",
        "description": "Imagines future failure and works backward to prevent it",
        "icon": "🔮",
        "category": "risk",
        "best_for": ["Risk mitigation", "Project planning", "Strategy validation"],
        "temperature": 0.6,  # Moderate for creative failure scenarios
        "prompt_prefix": "Conduct a pre-mortem analysis. Imagine this has failed spectacularly in the future. What went wrong? Work backward to identify risks and preventive measures.",
        "prompt_suffix": "\n\nImagined failure scenario:\nWhat went wrong:\n1.\n2.\n\nPreventive measures:",
    },
    {
        "id": "red_team",
        "name": "Red Team",
        "description": "Adversarial thinking to find vulnerabilities",
        "icon": "🔴",
        "category": "risk",
        "best_for": ["Security analysis", "Stress testing", "Finding weaknesses"],
        "temperature": 0.7,  # Higher for adversarial creativity
        "prompt_prefix": "Think like a red team. Your job is to find every possible weakness, vulnerability, and way this could fail or be exploited. Be thorough and adversarial.",
        "prompt_suffix": "\n\nVulnerabilities identified:\n1.\n2.\n\nAttack vectors:\nMitigation recommendations:",
    },
    {
        "id": "steelman",
        "name": "Steelman",
        "description": "Presents the strongest possible version of an argument",
        "icon": "💪",
        "category": "analysis",
        "best_for": ["Fair debate", "Understanding opposing views", "Intellectual honesty"],
        "temperature": 0.5,  # Balanced for fair representation
        "prompt_prefix": "Use steelmanning. Present the strongest possible version of each perspective, even those you might disagree with. Give every viewpoint its best defense.",
        "prompt_suffix": "\n\nStrongest case for perspective A:\nStrongest case for perspective B:\nMost defensible position:",
    },
]

# Pattern categories for grouping in UI
PATTERN_CATEGORIES = {
    "basic": {"name": "Basic", "description": "Standard response modes"},
    "reasoning": {"name": "Reasoning", "description": "Structured thinking patterns"},
    "analysis": {"name": "Analysis", "description": "Analytical frameworks"},
    "investigation": {"name": "Investigation", "description": "Research and discovery modes"},
    "creative": {"name": "Creative", "description": "Creative and lateral thinking"},
    "risk": {"name": "Risk", "description": "Risk assessment and adversarial thinking"},
}


def get_all_patterns() -> List[Dict[str, Any]]:
    """Get all available reasoning patterns."""
    return REASONING_PATTERNS


def get_pattern_by_id(pattern_id: str) -> Dict[str, Any]:
    """Get a specific pattern by ID."""
    for pattern in REASONING_PATTERNS:
        if pattern["id"] == pattern_id:
            return pattern
    return REASONING_PATTERNS[0]  # Default to standard


def get_patterns_by_category(category: str) -> List[Dict[str, Any]]:
    """Get all patterns in a category."""
    return [p for p in REASONING_PATTERNS if p["category"] == category]


def apply_pattern_to_prompt(base_prompt: str, pattern_id: str, query: str) -> str:
    """Apply a reasoning pattern to modify the prompt."""
    pattern = get_pattern_by_id(pattern_id)

    if pattern["id"] == "standard":
        return base_prompt

    # Build enhanced prompt with pattern
    enhanced_parts = []

    if base_prompt:
        enhanced_parts.append(base_prompt)

    if pattern["prompt_prefix"]:
        enhanced_parts.append(f"\n\n{pattern['prompt_prefix']}")

    return "\n".join(enhanced_parts)


def get_pattern_suffix(pattern_id: str) -> str:
    """Get the prompt suffix for a pattern (added to user query)."""
    pattern = get_pattern_by_id(pattern_id)
    return pattern.get("prompt_suffix", "")


def get_categories() -> Dict[str, Dict[str, str]]:
    """Get all pattern categories."""
    return PATTERN_CATEGORIES
