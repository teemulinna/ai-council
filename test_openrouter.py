#!/usr/bin/env python3
"""
Quick test script to verify OpenRouter API connection and model names.
Run this to diagnose any issues with the API.
"""

import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Test models - let's try ones that definitely exist
TEST_MODELS = [
    "anthropic/claude-3-opus-20240229",
    "anthropic/claude-3-sonnet-20240229",
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
    "google/gemini-pro",
]


async def test_model(model: str):
    """Test a single model."""
    print(f"\n🧪 Testing {model}...")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/test/ai-council",
        "X-Title": "AI Council Test",
    }

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say 'Hello' in one word"}],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )

            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                tokens = data.get('usage', {}).get('total_tokens', 0)
                print(f"   ✅ SUCCESS: {content.strip()[:50]} ({tokens} tokens)")
                return True
            else:
                print(f"   ❌ FAILED: {response.status_code}")
                print(f"      {response.text[:200]}")
                return False

    except Exception as e:
        print(f"   ❌ ERROR: {type(e).__name__}: {e}")
        return False


async def main():
    """Run all tests."""
    print("=" * 60)
    print("🔍 OpenRouter API Connection Test")
    print("=" * 60)

    # Check API key
    print(f"\n🔑 API Key: ", end="")
    if not OPENROUTER_API_KEY:
        print("❌ NOT SET!")
        print("\nPlease set OPENROUTER_API_KEY in your .env file")
        print("Get your key at: https://openrouter.ai/keys")
        return
    elif OPENROUTER_API_KEY == "sk-or-v1-your-key-here":
        print("❌ USING EXAMPLE KEY!")
        print("\nPlease replace the example key in .env with your real OpenRouter API key")
        return
    else:
        masked = OPENROUTER_API_KEY[:10] + "..." + OPENROUTER_API_KEY[-5:]
        print(f"✅ {masked}")

    # Test each model
    print(f"\n📋 Testing {len(TEST_MODELS)} models...")
    results = {}

    for model in TEST_MODELS:
        success = await test_model(model)
        results[model] = success

    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)

    successful = sum(1 for s in results.values() if s)
    total = len(results)

    for model, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {model}")

    print(f"\n✅ {successful}/{total} models working")

    if successful == 0:
        print("\n⚠️  NO MODELS WORKING!")
        print("\nPossible issues:")
        print("1. Invalid API key")
        print("2. No credits in OpenRouter account")
        print("3. Model names have changed")
        print("4. Network connectivity issues")
        print("\nCheck your OpenRouter dashboard: https://openrouter.ai/activity")
    elif successful < total:
        print("\n⚠️  Some models failed")
        print("Check which ones worked and update backend/config.py")
    else:
        print("\n🎉 All models working! Your setup is correct.")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())