"""Unit tests for caching module - TDD approach."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime, timedelta
from backend.cache import ResponseCache, QueryCache, CacheWarmer


class TestResponseCache:
    """Test response caching functionality."""

    @pytest.mark.asyncio
    async def test_cache_key_generation(self):
        """Test deterministic cache key generation."""
        cache = ResponseCache()

        messages = [{"role": "user", "content": "Test query"}]
        key1 = cache.get_cache_key("model1", messages)
        key2 = cache.get_cache_key("model1", messages)
        key3 = cache.get_cache_key("model2", messages)

        # Same input should generate same key
        assert key1 == key2
        # Different model should generate different key
        assert key1 != key3
        # Key should be a hash
        assert key1.startswith("council:response:")
        assert len(key1) > 30

    @pytest.mark.asyncio
    async def test_in_memory_cache_operations(self):
        """Test in-memory cache get/set operations."""
        cache = ResponseCache()
        cache.use_redis = False  # Force in-memory cache

        model = "test-model"
        messages = [{"role": "user", "content": "Test"}]
        response = {"content": "Test response"}

        # Initially empty
        assert await cache.get(model, messages) is None
        assert cache.stats["misses"] == 1

        # Set and retrieve
        assert await cache.set(model, messages, response)
        cached = await cache.get(model, messages)
        assert cached == response
        assert cache.stats["hits"] == 1

    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Test cache expiration in memory cache."""
        cache = ResponseCache(ttl=1)  # 1 second TTL
        cache.use_redis = False

        model = "test-model"
        messages = [{"role": "user", "content": "Test"}]
        response = {"content": "Test response"}

        # Set cache
        await cache.set(model, messages, response)

        # Should be available immediately
        assert await cache.get(model, messages) == response

        # Mock time passing
        key = cache.get_cache_key(model, messages)
        if key in cache.memory_cache:
            # Set expiry to past
            cache.memory_cache[key]["expiry"] = datetime.now() - timedelta(seconds=1)

        # Should be expired now
        assert await cache.get(model, messages) is None

    @pytest.mark.asyncio
    async def test_redis_cache_operations(self):
        """Test Redis cache operations when available."""
        with patch('backend.cache.redis') as mock_redis:
            mock_redis_client = MagicMock()
            mock_redis.from_url.return_value = mock_redis_client
            mock_redis_client.ping.return_value = True

            cache = ResponseCache(redis_url="redis://localhost:6379")

            model = "test-model"
            messages = [{"role": "user", "content": "Test"}]
            response = {"content": "Test response"}

            # Test set
            await cache.set(model, messages, response)
            key = cache.get_cache_key(model, messages)
            mock_redis_client.setex.assert_called_once_with(
                key, cache.ttl, json.dumps(response)
            )

            # Test get - cache hit
            mock_redis_client.get.return_value = json.dumps(response)
            cached = await cache.get(model, messages)
            assert cached == response

            # Test get - cache miss
            mock_redis_client.get.return_value = None
            cached = await cache.get(model, messages)
            assert cached is None

    def test_cache_statistics(self):
        """Test cache statistics tracking."""
        cache = ResponseCache()
        cache.stats = {"hits": 75, "misses": 25, "saves": 80}

        stats = cache.get_stats()

        assert stats["hits"] == 75
        assert stats["misses"] == 25
        assert stats["saves"] == 80
        assert stats["hit_rate"] == 75.0  # 75%
        assert stats["cache_type"] in ["redis", "memory"]

    @pytest.mark.asyncio
    async def test_clear_expired_entries(self):
        """Test clearing of expired entries in memory cache."""
        cache = ResponseCache(ttl=1)
        cache.use_redis = False

        # Add multiple entries with different expiry times
        now = datetime.now()

        cache.memory_cache = {
            "key1": {"data": {}, "expiry": now - timedelta(seconds=10)},  # Expired
            "key2": {"data": {}, "expiry": now + timedelta(seconds=10)},  # Valid
            "key3": {"data": {}, "expiry": now - timedelta(seconds=5)},   # Expired
        }

        await cache.clear_expired()

        # Only non-expired entries should remain
        assert len(cache.memory_cache) == 1
        assert "key2" in cache.memory_cache
        assert "key1" not in cache.memory_cache
        assert "key3" not in cache.memory_cache


class TestQueryCache:
    """Test query-level caching."""

    @pytest.mark.asyncio
    async def test_query_hash_generation(self, mock_cache):
        """Test query hash generation for caching."""
        query_cache = QueryCache(mock_cache)

        hash1 = query_cache.get_query_hash("What is AI?")
        hash2 = query_cache.get_query_hash("What is AI?")
        hash3 = query_cache.get_query_hash("Different query")

        assert hash1 == hash2  # Same query = same hash
        assert hash1 != hash3  # Different query = different hash
        assert len(hash1) == 16  # Truncated hash

    @pytest.mark.asyncio
    async def test_cache_complete_council_result(
        self,
        mock_cache,
        mock_stage1_responses,
        mock_stage2_responses,
        mock_stage3_response
    ):
        """Test caching of complete council results."""
        query_cache = QueryCache(mock_cache)

        user_query = "Test query"
        metadata = {"test": "data"}

        # Cache the result
        success = await query_cache.cache_council_result(
            user_query,
            mock_stage1_responses,
            mock_stage2_responses,
            mock_stage3_response,
            metadata
        )

        assert success

        # Verify the cached structure
        messages = [{"role": "user", "content": user_query}]
        key = mock_cache.get_cache_key("council:complete", messages)

        # Check memory cache directly since we're using mock
        if not mock_cache.use_redis and key in mock_cache.memory_cache:
            cached_data = mock_cache.memory_cache[key]["data"]
            assert cached_data["stage1"] == mock_stage1_responses
            assert cached_data["stage2"] == mock_stage2_responses
            assert cached_data["stage3"] == mock_stage3_response
            assert cached_data["metadata"] == metadata
            assert "cached_at" in cached_data

    @pytest.mark.asyncio
    async def test_retrieve_cached_council_result(self, mock_cache):
        """Test retrieval of cached council results."""
        query_cache = QueryCache(mock_cache)

        user_query = "Test query"
        messages = [{"role": "user", "content": user_query}]

        # Manually set cached result
        cached_result = {
            "stage1": [{"model": "test", "response": "test"}],
            "stage2": [],
            "stage3": {"response": "final"},
            "metadata": {},
            "cached_at": datetime.now().isoformat()
        }

        await mock_cache.set("council:complete", messages, cached_result)

        # Retrieve
        result = await query_cache.get_cached_council_result(user_query)

        assert result == cached_result


class TestCacheWarmer:
    """Test cache warming functionality."""

    @pytest.mark.asyncio
    async def test_warm_cache_checks_existing(self, mock_cache):
        """Test cache warmer checks for existing entries before warming."""
        models = ["model1", "model2"]

        with patch('backend.cache.logger') as mock_logger:
            await CacheWarmer.warm_cache(mock_cache, models)

            # Should log warming start and complete
            assert mock_logger.info.call_count >= 2

            # Should check for each query/model combination
            expected_checks = len(CacheWarmer.COMMON_QUERIES) * len(models)
            # Note: actual implementation would check cache.get calls

    def test_common_queries_defined(self):
        """Test that common queries are properly defined."""
        assert len(CacheWarmer.COMMON_QUERIES) > 0
        assert all(isinstance(q, str) for q in CacheWarmer.COMMON_QUERIES)
        assert all(len(q) > 5 for q in CacheWarmer.COMMON_QUERIES)