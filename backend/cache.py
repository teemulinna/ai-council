"""Caching layer for reducing API costs."""

import hashlib
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from .config import DEFAULT_CACHE_TTL

logger = logging.getLogger(__name__)

# Try to import Redis, fall back to in-memory cache if not available
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, using in-memory cache")


class ResponseCache:
    """Cache for LLM responses to reduce API costs."""

    def __init__(self, redis_url: str = "redis://localhost:6379", ttl: int = DEFAULT_CACHE_TTL):
        """
        Initialize cache with Redis or in-memory fallback.

        Args:
            redis_url: Redis connection URL
            ttl: Time-to-live for cache entries in seconds
        """
        self.ttl = ttl
        self.stats = {"hits": 0, "misses": 0, "saves": 0}

        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                self.redis_client.ping()
                self.use_redis = True
                logger.info("Using Redis cache")
            except (redis.ConnectionError, Exception) as e:
                logger.warning(f"Redis connection failed: {e}, using in-memory cache")
                self.use_redis = False
                self.memory_cache = {}
        else:
            self.use_redis = False
            self.memory_cache = {}
            logger.info("Using in-memory cache")

    def get_cache_key(self, model: str, messages: List[Dict[str, str]]) -> str:
        """
        Generate a unique cache key for model + messages.

        Args:
            model: Model identifier
            messages: Chat messages

        Returns:
            SHA256 hash as cache key
        """
        # Create a deterministic string representation
        content = json.dumps(
            {"model": model, "messages": messages},
            sort_keys=True,
            separators=(',', ':')
        )
        return f"council:response:{hashlib.sha256(content.encode()).hexdigest()}"

    async def get(self, model: str, messages: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
        """
        Get cached response if available.

        Args:
            model: Model identifier
            messages: Chat messages

        Returns:
            Cached response or None
        """
        key = self.get_cache_key(model, messages)

        try:
            if self.use_redis:
                cached = self.redis_client.get(key)
                if cached:
                    self.stats["hits"] += 1
                    logger.debug(f"Cache hit for {model}")
                    return json.loads(cached)
            else:
                # In-memory cache with expiry checking
                if key in self.memory_cache:
                    entry = self.memory_cache[key]
                    if datetime.now() < entry["expiry"]:
                        self.stats["hits"] += 1
                        logger.debug(f"Cache hit for {model}")
                        return entry["data"]
                    else:
                        # Expired, remove it
                        del self.memory_cache[key]

        except Exception as e:
            logger.error(f"Cache get error: {e}")

        self.stats["misses"] += 1
        logger.debug(f"Cache miss for {model}")
        return None

    async def set(
        self,
        model: str,
        messages: List[Dict[str, str]],
        response: Dict[str, Any]
    ) -> bool:
        """
        Cache a response.

        Args:
            model: Model identifier
            messages: Chat messages
            response: Response to cache

        Returns:
            True if successfully cached
        """
        key = self.get_cache_key(model, messages)

        try:
            if self.use_redis:
                self.redis_client.setex(
                    key,
                    self.ttl,
                    json.dumps(response)
                )
            else:
                # In-memory cache with expiry
                self.memory_cache[key] = {
                    "data": response,
                    "expiry": datetime.now() + timedelta(seconds=self.ttl)
                }

            self.stats["saves"] += 1
            logger.debug(f"Cached response for {model}")
            return True

        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False

    async def clear_expired(self):
        """Clear expired entries (for in-memory cache)."""
        if not self.use_redis:
            now = datetime.now()
            expired_keys = [
                k for k, v in self.memory_cache.items()
                if now >= v["expiry"]
            ]
            for key in expired_keys:
                del self.memory_cache[key]

            if expired_keys:
                logger.info(f"Cleared {len(expired_keys)} expired cache entries")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0

        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "saves": self.stats["saves"],
            "hit_rate": round(hit_rate, 2),
            "cache_type": "redis" if self.use_redis else "memory"
        }


class QueryCache:
    """Cache for complete query results (all stages)."""

    def __init__(self, cache: ResponseCache):
        """
        Initialize query cache.

        Args:
            cache: Underlying response cache
        """
        self.cache = cache

    def get_query_hash(self, user_query: str) -> str:
        """Generate hash for a user query."""
        return hashlib.sha256(user_query.encode()).hexdigest()[:16]

    async def get_cached_council_result(
        self,
        user_query: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached complete council result if available.

        Args:
            user_query: User's question

        Returns:
            Cached result with all stages or None
        """
        # Create a synthetic message format for caching
        messages = [{"role": "user", "content": user_query}]

        # Check if we have cached results for each stage
        cached_result = await self.cache.get("council:complete", messages)

        if cached_result:
            logger.info(f"Found complete cached result for query")
            return cached_result

        return None

    async def cache_council_result(
        self,
        user_query: str,
        stage1_results: List[Dict[str, Any]],
        stage2_results: List[Dict[str, Any]],
        stage3_result: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Cache complete council result.

        Args:
            user_query: User's question
            stage1_results: Stage 1 results
            stage2_results: Stage 2 results
            stage3_result: Stage 3 result
            metadata: Additional metadata

        Returns:
            True if successfully cached
        """
        messages = [{"role": "user", "content": user_query}]

        complete_result = {
            "stage1": stage1_results,
            "stage2": stage2_results,
            "stage3": stage3_result,
            "metadata": metadata,
            "cached_at": datetime.now().isoformat()
        }

        return await self.cache.set("council:complete", messages, complete_result)


class CacheWarmer:
    """Pre-warm cache with common queries."""

    COMMON_QUERIES = [
        "What is the meaning of life?",
        "Explain quantum computing in simple terms",
        "How does machine learning work?",
        "What are the best practices for software development?",
    ]

    @staticmethod
    async def warm_cache(cache: ResponseCache, models: List[str]):
        """
        Pre-warm cache with common queries.

        Args:
            cache: Cache instance
            models: Models to warm cache for
        """
        logger.info("Starting cache warming")

        for query in CacheWarmer.COMMON_QUERIES:
            messages = [{"role": "user", "content": query}]

            for model in models:
                # Check if already cached
                existing = await cache.get(model, messages)
                if not existing:
                    # In production, you would actually query the model here
                    logger.debug(f"Would warm cache for {model} with: {query[:50]}...")

        logger.info("Cache warming complete")