#!/bin/bash
# Run comprehensive test suite for AI Council MVP

echo "🧪 AI Council MVP Test Suite"
echo "============================"
echo ""

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Install test dependencies if needed
echo "📦 Installing test dependencies..."
pip install -q pytest pytest-asyncio pytest-cov pytest-mock pytest-bdd

# Set test environment variables
export TESTING=true
export OPENROUTER_API_KEY="test-key-12345"

# Run tests with coverage
echo ""
echo "🏃 Running Unit Tests..."
echo "------------------------"
python -m pytest tests/unit/ -v --tb=short

echo ""
echo "🏃 Running Integration Tests..."
echo "-------------------------------"
python -m pytest tests/integration/ -v --tb=short

echo ""
echo "📊 Coverage Report..."
echo "--------------------"
python -m pytest tests/ --cov=backend --cov-report=term-missing --cov-report=html

echo ""
echo "✅ Test Results Summary"
echo "----------------------"
python -m pytest tests/ --tb=no -q

echo ""
echo "📈 Coverage report available in htmlcov/index.html"
echo ""
echo "🎯 To run specific tests:"
echo "  pytest tests/unit/test_resilience.py -v"
echo "  pytest tests/integration/test_api.py::TestAPIEndpoints::test_health_check -v"
echo ""
echo "🚀 To run the application:"
echo "  ./start.sh"