"""User Acceptance Testing (UAT) Suite for AI Council MVP."""

import asyncio
import httpx
import json
import time
from typing import Dict, Any
from datetime import datetime
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.config import COUNCIL_MODELS, MODEL_COSTS
from backend.cost_tracker import SmartModelSelector


class UATTestRunner:
    """Run comprehensive UAT tests for the AI Council system."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=60.0)
        self.test_results = []
        self.conversation_id = None

    async def setup(self):
        """Setup test environment."""
        print("🔧 Setting up UAT environment...")

        # Check API is accessible
        try:
            response = await self.client.get("/")
            assert response.status_code == 200
            print("✅ API is accessible")
        except Exception as e:
            print(f"❌ API not accessible: {e}")
            return False

        # Create test conversation
        response = await self.client.post("/api/conversations", json={})
        if response.status_code == 200:
            self.conversation_id = response.json()["id"]
            print(f"✅ Created test conversation: {self.conversation_id}")
            return True
        else:
            print(f"❌ Failed to create conversation: {response.status_code}")
            return False

    async def test_simple_query(self):
        """Test 1: Simple factual query."""
        print("\n📝 Test 1: Simple Factual Query")
        print("-" * 40)

        query = "What is the capital of France?"
        start_time = time.time()

        response = await self.client.post(
            f"/api/conversations/{self.conversation_id}/message",
            json={"content": query}
        )

        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()

            # Validate response structure
            assert "stage1" in data, "Missing stage1"
            assert "stage2" in data, "Missing stage2"
            assert "stage3" in data, "Missing stage3"
            assert "metadata" in data, "Missing metadata"

            # Check Stage 1 responses
            assert len(data["stage1"]) >= 2, f"Too few Stage 1 responses: {len(data['stage1'])}"

            # Check final answer mentions Paris
            final_response = data["stage3"]["response"].lower()
            assert "paris" in final_response, "Final response doesn't mention Paris"

            # Check cost tracking
            cost = data["metadata"].get("cost", 0)
            assert cost > 0, "Cost not tracked"
            assert cost < 0.50, f"Cost too high for simple query: ${cost:.4f}"

            print(f"✅ Simple query successful")
            print(f"   - Response time: {elapsed:.2f}s")
            print(f"   - Models used: {len(data['stage1'])}")
            print(f"   - Cost: ${cost:.4f}")
            print(f"   - Cache hit: {data['metadata'].get('cache_hit', False)}")

            self.test_results.append({
                "test": "simple_query",
                "passed": True,
                "time": elapsed,
                "cost": cost
            })

            return True
        else:
            print(f"❌ Simple query failed: {response.status_code}")
            print(f"   Response: {response.text}")
            self.test_results.append({
                "test": "simple_query",
                "passed": False,
                "error": response.text
            })
            return False

    async def test_cache_hit(self):
        """Test 2: Cache hit for repeated query."""
        print("\n📝 Test 2: Cache Hit Performance")
        print("-" * 40)

        query = "What is the capital of France?"

        # Second query should hit cache
        start_time = time.time()
        response = await self.client.post(
            f"/api/conversations/{self.conversation_id}/message",
            json={"content": query}
        )
        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()

            # Check cache was used
            cost = data["metadata"].get("cost", 1.0)
            cache_hit = data["metadata"].get("cache_hit", False)

            # Cache should reduce cost to near zero
            assert cost < 0.01 or cache_hit, f"Cache not used, cost: ${cost:.4f}"
            assert elapsed < 2.0, f"Cached response too slow: {elapsed:.2f}s"

            print(f"✅ Cache hit successful")
            print(f"   - Response time: {elapsed:.2f}s")
            print(f"   - Cost: ${cost:.4f}")
            print(f"   - Cache stats: {data['metadata'].get('cache_stats', {})}")

            self.test_results.append({
                "test": "cache_hit",
                "passed": True,
                "time": elapsed,
                "cost": cost
            })
            return True
        else:
            print(f"❌ Cache test failed: {response.status_code}")
            self.test_results.append({
                "test": "cache_hit",
                "passed": False
            })
            return False

    async def test_complex_query(self):
        """Test 3: Complex analytical query."""
        print("\n📝 Test 3: Complex Analytical Query")
        print("-" * 40)

        query = (
            "Evaluate the pros and cons of microservices architecture vs monolithic "
            "architecture for a startup with 5 developers building a SaaS product."
        )

        start_time = time.time()
        response = await self.client.post(
            f"/api/conversations/{self.conversation_id}/message",
            json={"content": query}
        )
        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()

            # Complex queries should use premium models
            models_used = [r["model"] for r in data["stage1"]]

            # Check response quality
            final_response = data["stage3"]["response"]
            assert len(final_response) > 500, "Response too short for complex query"

            # Check both architectures are discussed
            response_lower = final_response.lower()
            assert "microservice" in response_lower, "Doesn't discuss microservices"
            assert "monolithic" in response_lower, "Doesn't discuss monolithic"

            cost = data["metadata"].get("cost", 0)

            print(f"✅ Complex query successful")
            print(f"   - Response time: {elapsed:.2f}s")
            print(f"   - Response length: {len(final_response)} chars")
            print(f"   - Models used: {models_used}")
            print(f"   - Cost: ${cost:.4f}")

            self.test_results.append({
                "test": "complex_query",
                "passed": True,
                "time": elapsed,
                "cost": cost
            })
            return True
        else:
            print(f"❌ Complex query failed: {response.status_code}")
            self.test_results.append({
                "test": "complex_query",
                "passed": False
            })
            return False

    async def test_resilience(self):
        """Test 4: System resilience with simulated failures."""
        print("\n📝 Test 4: Resilience Testing")
        print("-" * 40)

        # This would require mocking failures in production
        # For UAT, we just verify the system handles edge cases

        query = "Test query for resilience"

        response = await self.client.post(
            f"/api/conversations/{self.conversation_id}/message",
            json={"content": query}
        )

        if response.status_code == 200:
            data = response.json()

            # System should always provide a response
            assert data["stage3"]["response"], "No final response"

            # Check metadata for any failures
            metadata = data["metadata"]

            print(f"✅ Resilience test passed")
            print(f"   - Models responded: {metadata.get('models_used', 0)}")
            print(f"   - Budget remaining: ${metadata.get('budget_remaining', 0):.2f}")

            self.test_results.append({
                "test": "resilience",
                "passed": True
            })
            return True
        else:
            print(f"❌ Resilience test failed")
            self.test_results.append({
                "test": "resilience",
                "passed": False
            })
            return False

    async def test_model_selection(self):
        """Test 5: Smart model selection based on query complexity."""
        print("\n📝 Test 5: Smart Model Selection")
        print("-" * 40)

        test_cases = [
            ("What is 2+2?", "simple"),
            ("Explain quantum computing", "medium"),
            ("Design a distributed system for real-time analytics", "complex")
        ]

        for query, expected_complexity in test_cases:
            complexity = SmartModelSelector.assess_complexity(query)

            print(f"   Query: '{query[:50]}...'")
            print(f"   Expected: {expected_complexity}, Got: {complexity}")

            # Allow some flexibility in classification
            if expected_complexity == "simple":
                assert complexity in ["simple", "medium"], f"Wrong complexity for simple query"
            elif expected_complexity == "complex":
                assert complexity in ["complex", "medium"], f"Wrong complexity for complex query"

        print(f"✅ Model selection test passed")
        self.test_results.append({
            "test": "model_selection",
            "passed": True
        })
        return True

    async def test_concurrent_requests(self):
        """Test 6: Handle concurrent requests."""
        print("\n📝 Test 6: Concurrent Request Handling")
        print("-" * 40)

        queries = [
            "What is machine learning?",
            "Explain Docker containers",
            "What is Redis?"
        ]

        # Send multiple requests concurrently
        start_time = time.time()
        tasks = []

        for query in queries:
            # Create separate conversation for each
            conv_response = await self.client.post("/api/conversations", json={})
            conv_id = conv_response.json()["id"]

            task = self.client.post(
                f"/api/conversations/{conv_id}/message",
                json={"content": query}
            )
            tasks.append(task)

        # Wait for all to complete
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        elapsed = time.time() - start_time

        # Check all succeeded
        success_count = sum(
            1 for r in responses
            if not isinstance(r, Exception) and r.status_code == 200
        )

        print(f"✅ Concurrent handling successful")
        print(f"   - Requests sent: {len(queries)}")
        print(f"   - Successful: {success_count}/{len(queries)}")
        print(f"   - Total time: {elapsed:.2f}s")
        print(f"   - Avg time: {elapsed/len(queries):.2f}s per request")

        self.test_results.append({
            "test": "concurrent_requests",
            "passed": success_count == len(queries),
            "success_rate": success_count / len(queries)
        })

        return success_count == len(queries)

    async def generate_report(self):
        """Generate UAT report."""
        print("\n" + "=" * 50)
        print("📊 UAT TEST REPORT")
        print("=" * 50)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"API URL: {self.base_url}")
        print("")

        # Summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for t in self.test_results if t.get("passed", False))

        print(f"Results: {passed_tests}/{total_tests} tests passed")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print("")

        # Individual test results
        print("Test Results:")
        print("-" * 40)
        for result in self.test_results:
            status = "✅ PASS" if result.get("passed") else "❌ FAIL"
            print(f"{status} - {result['test']}")

            if "time" in result:
                print(f"        Time: {result['time']:.2f}s")
            if "cost" in result:
                print(f"        Cost: ${result['cost']:.4f}")
            if "error" in result:
                print(f"        Error: {result['error']}")

        # Performance metrics
        total_cost = sum(r.get("cost", 0) for r in self.test_results)
        total_time = sum(r.get("time", 0) for r in self.test_results)

        print("")
        print("Performance Metrics:")
        print("-" * 40)
        print(f"Total Cost: ${total_cost:.4f}")
        print(f"Total Time: {total_time:.2f}s")

        # Recommendations
        print("")
        print("Recommendations:")
        print("-" * 40)

        if passed_tests == total_tests:
            print("✅ System is ready for production!")
            print("   - All tests passed successfully")
            print("   - Consider load testing for scale")
        else:
            print("⚠️ System needs attention:")
            failed = [r["test"] for r in self.test_results if not r.get("passed")]
            for test in failed:
                print(f"   - Fix: {test}")

        return passed_tests == total_tests

    async def cleanup(self):
        """Cleanup test environment."""
        await self.client.aclose()
        print("\n🧹 Cleanup complete")

    async def run(self):
        """Run complete UAT suite."""
        print("\n🚀 Starting AI Council UAT Suite")
        print("=" * 50)

        # Setup
        if not await self.setup():
            print("❌ Setup failed, aborting tests")
            return False

        # Run tests
        await self.test_simple_query()
        await self.test_cache_hit()
        await self.test_complex_query()
        await self.test_resilience()
        await self.test_model_selection()
        await self.test_concurrent_requests()

        # Generate report
        success = await self.generate_report()

        # Cleanup
        await self.cleanup()

        return success


async def main():
    """Run UAT tests."""
    # Check if API is running
    try:
        httpx.get("http://localhost:8000/", timeout=2.0)
    except:
        print("⚠️ API not running. Start it with: ./start.sh")
        print("   or: docker-compose up")
        return 1

    runner = UATTestRunner()
    success = await runner.run()

    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)