"""OpenRouter API client for making LLM requests."""

import httpx
from typing import List, Dict, Any, Optional

try:
    from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL
except ImportError:
    from config import OPENROUTER_API_KEY, OPENROUTER_API_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
    import logging
    logger = logging.getLogger(__name__)

    # Validate API key
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "test-key-12345":
        logger.error("OpenRouter API key not configured or using test key!")
        return None

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/yourusername/ai-council",  # Optional but recommended
        "X-Title": "AI Council",  # Optional but recommended
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    logger.info(f"🚀 Querying {model}...")
    logger.debug(f"   API URL: {OPENROUTER_API_URL}")
    logger.debug(f"   Message: {messages[0]['content'][:100]}...")

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )

            logger.debug(f"   Response status: {response.status_code}")

            # Check for errors
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"❌ {model} failed: {response.status_code} - {error_text}")
                return None

            response.raise_for_status()
            data = response.json()

            # Extract message and usage
            message = data['choices'][0]['message']
            usage = data.get('usage', {})

            result = {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details'),
                'usage': usage
            }

            logger.info(f"✅ {model} responded ({usage.get('total_tokens', 0)} tokens)")
            return result

    except httpx.TimeoutException as e:
        logger.error(f"⏱️ {model} timed out after {timeout}s: {e}")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"❌ {model} HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except KeyError as e:
        logger.error(f"❌ {model} invalid response format: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ {model} unexpected error: {type(e).__name__}: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model
        timeout: Request timeout in seconds

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio
    import logging

    logger = logging.getLogger(__name__)
    logger.info(f"Querying {len(models)} models in parallel with timeout {timeout}s")

    # Create tasks for all models
    tasks = [query_model(model, messages, timeout) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    # Map models to their responses, handling exceptions
    result = {}
    for model, response in zip(models, responses):
        if isinstance(response, Exception):
            logger.error(f"Exception querying {model}: {response}")
            result[model] = None
        else:
            result[model] = response
            if response:
                logger.info(f"✓ {model} responded successfully")
            else:
                logger.warning(f"✗ {model} returned None")

    return result


async def fetch_available_models() -> List[Dict[str, Any]]:
    """
    Fetch available models from OpenRouter API.

    Returns:
        List of model objects with id, name, pricing, context_length, etc.
    """
    import logging
    logger = logging.getLogger(__name__)

    models_url = "https://openrouter.ai/api/v1/models"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(models_url)
            response.raise_for_status()
            data = response.json()

            models = data.get('data', [])
            logger.info(f"✅ Fetched {len(models)} models from OpenRouter")
            return models

    except Exception as e:
        logger.error(f"❌ Failed to fetch models from OpenRouter: {e}")
        return []
