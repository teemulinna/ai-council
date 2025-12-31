"""3-stage LLM Council orchestration."""

import logging
from typing import List, Dict, Any, Tuple, Optional
from .openrouter import query_models_parallel, query_model
from .config import COUNCIL_MODELS, CHAIRMAN_MODEL, MODEL_PROVIDERS, MODEL_PRICING
from .resilience import ResilientCouncil, PartialResponseHandler
from .cache import ResponseCache, QueryCache
from .cost_tracker import CostTracker, SmartModelSelector
from .agent_roles import CouncilComposer, RoleAssigner

logger = logging.getLogger(__name__)

# Initialize shared instances
resilient_council = ResilientCouncil(min_responses_required=3)
cache = ResponseCache()
query_cache = QueryCache(cache)
cost_tracker = CostTracker()
council_composer = CouncilComposer()


async def stage1_collect_responses(
    user_query: str,
    use_smart_selection: bool = True,
    council_config: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Stage 1: Collect individual responses from all council models with resilience and caching.

    Args:
        user_query: The user's question
        use_smart_selection: Whether to use smart model selection based on complexity

    Returns:
        List of dicts with 'model' and 'response' keys
    """
    messages = [{"role": "user", "content": user_query}]

    # Smart model selection based on query complexity and budget
    if use_smart_selection:
        remaining_budget = cost_tracker.get_remaining_budget()
        selected_models = SmartModelSelector.select_models(
            user_query,
            remaining_budget
        )
    else:
        selected_models = COUNCIL_MODELS

    # Check budget before proceeding
    estimated_cost = cost_tracker.estimate_cost(selected_models)
    if not cost_tracker.can_proceed(estimated_cost):
        logger.error(f"Budget exceeded. Estimated cost: ${estimated_cost:.4f}")
        raise ValueError(f"Budget limit exceeded. Remaining: ${cost_tracker.get_remaining_budget():.2f}")

    # Try to get cached responses first
    cached_responses = {}
    uncached_models = []

    for model in selected_models:
        cached = await cache.get(model, messages)
        if cached:
            cached_responses[model] = cached
            logger.info(f"Cache hit for {model}")
        else:
            uncached_models.append(model)

    # Query uncached models with resilience
    fresh_responses = {}
    if uncached_models:
        logger.info(f"Querying {len(uncached_models)} uncached models")
        fresh_responses = await resilient_council.execute_with_fallback(
            uncached_models,
            messages
        )

        # Cache fresh responses and track costs
        for model, response in fresh_responses.items():
            if response:
                await cache.set(model, messages, response)
                # Track cost with detailed token breakdown
                usage = response.get('usage', {})
                cost_tracker.track_usage(
                    model,
                    tokens=usage.get('total_tokens', 1000),
                    input_tokens=usage.get('prompt_tokens', 0),
                    output_tokens=usage.get('completion_tokens', 0)
                )

    # Combine all responses
    all_responses = {**cached_responses, **fresh_responses}

    # Helper to get provider info
    def get_provider_info(model_id: str) -> Dict[str, str]:
        provider_key = model_id.split('/')[0] if '/' in model_id else 'unknown'
        return MODEL_PROVIDERS.get(provider_key, {"name": provider_key.title(), "color": "#888888"})

    # Helper to calculate cost for a response
    def calc_cost(model_id: str, usage: Dict) -> float:
        if model_id in MODEL_PRICING:
            pricing = MODEL_PRICING[model_id]
            input_cost = (usage.get('prompt_tokens', 0) / 1_000_000) * pricing['input']
            output_cost = (usage.get('completion_tokens', 0) / 1_000_000) * pricing['output']
            return round(input_cost + output_cost, 6)
        return 0.0

    # Format results with cost/token info
    stage1_results = []
    for model, response in all_responses.items():
        if response is not None and resilient_council.validate_response(response):
            usage = response.get('usage', {})
            stage1_results.append({
                "model": model,
                "response": response.get('content', ''),
                "provider": get_provider_info(model),
                "tokens": {
                    "input": usage.get('prompt_tokens', 0),
                    "output": usage.get('completion_tokens', 0),
                    "total": usage.get('total_tokens', 0)
                },
                "cost": calc_cost(model, usage)
            })

    # Check if we have enough responses
    if not PartialResponseHandler.can_proceed_with_partial(
        {m: r for m, r in zip([r["model"] for r in stage1_results], stage1_results)},
        min_required=resilient_council.min_responses_required
    ):
        logger.warning(f"Only got {len(stage1_results)} valid responses")

    return stage1_results


async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """
    Stage 2: Each model ranks the anonymized responses.

    Args:
        user_query: The original user query
        stage1_results: Results from Stage 1

    Returns:
        Tuple of (rankings list, label_to_model mapping)
    """
    # Create anonymized labels for responses (Response A, Response B, etc.)
    labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...

    # Create mapping from label to model name
    label_to_model = {
        f"Response {label}": result['model']
        for label, result in zip(labels, stage1_results)
    }

    # Build the ranking prompt
    responses_text = "\n\n".join([
        f"Response {label}:\n{result['response']}"
        for label, result in zip(labels, stage1_results)
    ])

    ranking_prompt = f"""You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:"""

    messages = [{"role": "user", "content": ranking_prompt}]

    # Get rankings from all council models in parallel
    responses = await query_models_parallel(COUNCIL_MODELS, messages)

    # Format results
    stage2_results = []
    for model, response in responses.items():
        if response is not None:
            full_text = response.get('content', '')
            parsed = parse_ranking_from_text(full_text)
            stage2_results.append({
                "model": model,
                "ranking": full_text,
                "parsed_ranking": parsed
            })

    return stage2_results, label_to_model


async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Stage 3: Chairman synthesizes final response.

    Args:
        user_query: The original user query
        stage1_results: Individual model responses from Stage 1
        stage2_results: Rankings from Stage 2

    Returns:
        Dict with 'model' and 'response' keys
    """
    # Build comprehensive context for chairman
    stage1_text = "\n\n".join([
        f"Model: {result['model']}\nResponse: {result['response']}"
        for result in stage1_results
    ])

    stage2_text = "\n\n".join([
        f"Model: {result['model']}\nRanking: {result['ranking']}"
        for result in stage2_results
    ])

    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}

STAGE 2 - Peer Rankings:
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]

    # Query the chairman model
    response = await query_model(CHAIRMAN_MODEL, messages)

    if response is None:
        # Fallback if chairman fails
        return {
            "model": CHAIRMAN_MODEL,
            "response": "Error: Unable to generate final synthesis."
        }

    return {
        "model": CHAIRMAN_MODEL,
        "response": response.get('content', '')
    }


def parse_ranking_from_text(ranking_text: str) -> List[str]:
    """
    Parse the FINAL RANKING section from the model's response.

    Args:
        ranking_text: The full text response from the model

    Returns:
        List of response labels in ranked order (max 3-5 items typically)
    """
    import re

    def extract_ranking_from_section(section: str) -> List[str]:
        """Extract rankings from a text section, looking for consecutive numbered list."""
        # Find all numbered entries with Response labels
        # Pattern: number followed by separator, then "Response X"
        pattern = r'(\d+)[\.\)\:\s]+\s*Response\s+([A-Z])'
        matches = re.findall(pattern, section, re.IGNORECASE)

        if not matches:
            return []

        # Build a dict: position -> letter
        ranking_dict = {}
        for num_str, letter in matches:
            num = int(num_str)
            # Only accept positions 1-10 (reasonable ranking range)
            if 1 <= num <= 10:
                # If we already have this position, only keep first occurrence
                if num not in ranking_dict:
                    ranking_dict[num] = letter.upper()

        if not ranking_dict:
            return []

        # Check if we have consecutive numbers starting from 1
        # This filters out scattered mentions like "Response A in point 3..."
        sorted_positions = sorted(ranking_dict.keys())

        # Must start with 1 and be consecutive (1,2,3 not 1,3,5)
        if sorted_positions[0] != 1:
            return []

        results = []
        for i, expected_pos in enumerate(range(1, len(sorted_positions) + 1)):
            if i < len(sorted_positions) and sorted_positions[i] == expected_pos:
                results.append(f"Response {ranking_dict[expected_pos]}")
            else:
                break  # Stop at first gap

        # Must have at least 2 rankings to be valid
        return results if len(results) >= 2 else []

    # Strategy 1: Look for explicit "FINAL RANKING:" section
    ranking_headers = [
        r'FINAL RANKING[:\s]*',
        r'MY RANKING[:\s]*',
        r'RANKING[:\s]*\n',
        r'RANKED ORDER[:\s]*',
    ]

    for header_pattern in ranking_headers:
        ranking_match = re.search(header_pattern, ranking_text, re.IGNORECASE)
        if ranking_match:
            # Extract section after the header (limit to avoid evaluation text)
            ranking_section = ranking_text[ranking_match.end():ranking_match.end() + 300]
            results = extract_ranking_from_section(ranking_section)
            if results:
                return results

    # Strategy 2: Look for ranking at the very end of the response
    # Split into paragraphs and check the last few
    paragraphs = ranking_text.strip().split('\n\n')
    if len(paragraphs) >= 1:
        # Check last 2 paragraphs
        last_content = '\n\n'.join(paragraphs[-2:]) if len(paragraphs) >= 2 else paragraphs[-1]
        # Limit to last 400 chars
        last_content = last_content[-400:]
        results = extract_ranking_from_section(last_content)
        if results:
            return results

    # Strategy 3: Look for bullet-point rankings anywhere
    bullet_pattern = r'[-•*]\s*Response\s+([A-Z])\s*(?:\(|$|\n)'
    bullet_matches = re.findall(bullet_pattern, ranking_text[-500:], re.IGNORECASE)
    if len(bullet_matches) >= 2:
        # Deduplicate while preserving order
        seen = set()
        results = []
        for letter in bullet_matches:
            upper_letter = letter.upper()
            if upper_letter not in seen:
                seen.add(upper_letter)
                results.append(f"Response {upper_letter}")
        if len(results) >= 2:
            return results

    # No valid ranking found
    return []


def calculate_aggregate_rankings(
    stage2_results: List[Dict[str, Any]],
    label_to_model: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Calculate aggregate rankings across all models.

    Args:
        stage2_results: Rankings from each model
        label_to_model: Mapping from anonymous labels to model names

    Returns:
        List of dicts with model name and average rank, sorted best to worst
    """
    from collections import defaultdict

    # Track positions for each model
    model_positions = defaultdict(list)

    for ranking in stage2_results:
        ranking_text = ranking['ranking']

        # Parse the ranking from the structured format
        parsed_ranking = parse_ranking_from_text(ranking_text)

        for position, label in enumerate(parsed_ranking, start=1):
            if label in label_to_model:
                model_name = label_to_model[label]
                model_positions[model_name].append(position)

    # Calculate average position for each model
    aggregate = []
    for model, positions in model_positions.items():
        if positions:
            avg_rank = sum(positions) / len(positions)
            aggregate.append({
                "model": model,
                "average_rank": round(avg_rank, 2),
                "rankings_count": len(positions)
            })

    # Sort by average rank (lower is better)
    aggregate.sort(key=lambda x: x['average_rank'])

    return aggregate


async def generate_conversation_title(user_query: str) -> str:
    """
    Generate a short title for a conversation based on the first user message.

    Args:
        user_query: The first user message

    Returns:
        A short title (3-5 words)
    """
    title_prompt = f"""Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: {user_query}

Title:"""

    messages = [{"role": "user", "content": title_prompt}]

    # Use gemini-1.5-flash for title generation (fast and cheap)
    response = await query_model("google/gemini-1.5-flash", messages, timeout=30.0)

    if response is None:
        # Fallback to a generic title
        return "New Conversation"

    title = response.get('content', 'New Conversation').strip()

    # Clean up the title - remove quotes, limit length
    title = title.strip('"\'')

    # Truncate if too long
    if len(title) > 50:
        title = title[:47] + "..."

    return title


async def run_full_council(
    user_query: str,
    use_cache: bool = True,
    council_config: Optional[Dict[str, Any]] = None
) -> Tuple[List, List, Dict, Dict]:
    """
    Run the complete 3-stage council process with caching and resilience.

    Args:
        user_query: The user's question
        use_cache: Whether to use cached results if available

    Returns:
        Tuple of (stage1_results, stage2_results, stage3_result, metadata)
    """
    # Check for cached complete result
    if use_cache:
        cached_result = await query_cache.get_cached_council_result(user_query)
        if cached_result:
            logger.info("Using cached council result")
            # Add cache hit to metadata
            cached_result["metadata"]["cache_hit"] = True
            cached_result["metadata"]["cost"] = 0.0
            return (
                cached_result["stage1"],
                cached_result["stage2"],
                cached_result["stage3"],
                cached_result["metadata"]
            )

    # Track initial budget state
    initial_spend = cost_tracker.current_spend

    try:
        # Stage 1: Collect individual responses with resilience
        stage1_results = await stage1_collect_responses(
            user_query,
            council_config=council_config
        )

        # If no models responded successfully, return error
        if not stage1_results:
            return [], [], {
                "model": "error",
                "response": "All models failed to respond. Fallback models were also unavailable. Please try again."
            }, {"error": "no_responses", "cost": 0.0}

        # Adjust for partial responses if needed
        stage1_results = PartialResponseHandler.adjust_stage2_for_partial(stage1_results)

        if not stage1_results:
            return stage1_results, [], {
                "model": "error",
                "response": "Insufficient responses for ranking. Only one model responded."
            }, {"error": "insufficient_responses", "cost": cost_tracker.current_spend - initial_spend}

        # Stage 2: Collect rankings
        stage2_results, label_to_model = await stage2_collect_rankings(user_query, stage1_results)

        # Calculate aggregate rankings
        aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)

        # Stage 3: Synthesize final answer
        stage3_result = await stage3_synthesize_final(
            user_query,
            stage1_results,
            stage2_results
        )

        # Calculate total cost
        total_cost = cost_tracker.current_spend - initial_spend

        # Prepare metadata
        metadata = {
            "label_to_model": label_to_model,
            "aggregate_rankings": aggregate_rankings,
            "cost": round(total_cost, 4),
            "cache_hit": False,
            "models_used": len(stage1_results),
            "budget_remaining": cost_tracker.get_remaining_budget(),
            "cache_stats": cache.get_stats()
        }

        # Cache the complete result
        if use_cache:
            await query_cache.cache_council_result(
                user_query,
                stage1_results,
                stage2_results,
                stage3_result,
                metadata
            )

        return stage1_results, stage2_results, stage3_result, metadata

    except ValueError as e:
        # Budget exceeded or other value errors
        logger.error(f"Council error: {e}")
        return [], [], {
            "model": "error",
            "response": str(e)
        }, {"error": "budget_exceeded", "cost": cost_tracker.current_spend - initial_spend}

    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected council error: {e}")
        return [], [], {
            "model": "error",
            "response": f"An unexpected error occurred: {str(e)}"
        }, {"error": "unexpected", "cost": cost_tracker.current_spend - initial_spend}
