# Testing Strategy & Guide - AI Council

## Overview

This document defines the testing approach, best practices, and how to run tests for the AI Council project.

**Current State:** 90 tests passing (100% pass rate)
- Frontend: 50 tests (Vitest + React Testing Library)
- Backend: 40 tests (Pytest)

---

## Testing Pyramid

```
      ╔═════════════════╗
      ║    E2E Tests    ║  10-15 tests (5%)
      ║  Full workflows ║
      ╠═════════════════╣
      ║ Integration     ║  30-40 tests (35%)
      ║ Multi-component ║
      ╠═════════════════╣
      ║    Unit Tests   ║  50-60 tests (60%)
      ║ Single module   ║
      ╚═════════════════╝

Target Distribution:
- Unit: 60% (well-isolated, fast)
- Integration: 35% (real interactions)
- E2E: 5% (full user journeys)
```

---

## Running Tests

### Quick Start

```bash
# Run all tests
./run_tests.sh

# Frontend only
cd frontend && npm test

# Backend only
pytest tests/ -v
```

### Frontend Tests

```bash
# Install dependencies
cd frontend && npm install

# Run all tests
npm test

# Run with UI
npm run test:ui

# Coverage report
npm run test:coverage

# Watch mode
npm test -- --watch
```

**Framework:** Vitest 4.0.13
**Configuration:** `frontend/vitest.config.js`
**Tests Location:** `frontend/src/**/*.test.{js,jsx,ts,tsx}`

### Backend Tests

```bash
# Install dependencies
pip install -r requirements-test.txt

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/unit/test_cache.py -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html

# Run specific test
pytest tests/unit/test_cache.py::test_cache_stores_value -v

# Parallel execution
pytest tests/ -n auto
```

**Framework:** Pytest (Python 3.10+)
**Configuration:** `tests/conftest.py`
**Tests Location:** `tests/**/*.py`

---

## Test Organization

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CouncilCanvas.jsx
│   │   ├── ChatPanel.jsx
│   │   └── ... (components with tests)
│   ├── stores/
│   │   └── rolesStore.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── presets.js
│   └── test/
│       └── setup.js
├── vitest.config.js
└── package.json
```

### Backend Structure

```
backend/
├── agent_roles.py
├── cache.py
├── council.py
├── resilience.py
└── ... (modules)

tests/
├── conftest.py
├── unit/
│   ├── test_agent_roles.py
│   ├── test_cache.py
│   └── test_resilience.py
├── integration/
│   ├── test_council_execution.py (planned)
│   └── test_api_endpoints.py (planned)
└── e2e/
    └── test_full_workflows.py (planned)
```

---

## Writing Tests

### Frontend Test Example

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CouncilCanvas from '../components/CouncilCanvas';

describe('CouncilCanvas', () => {
  let mockData;

  beforeEach(() => {
    mockData = {
      council: {
        id: '1',
        participants: ['gpt-4', 'claude-3', 'gemini-2'],
        chairman: 'claude-opus'
      }
    };
  });

  it('should render canvas with participants', () => {
    render(<CouncilCanvas data={mockData} />);
    expect(screen.getByText(/Claude/i)).toBeInTheDocument();
  });

  it('should handle node drag', () => {
    render(<CouncilCanvas data={mockData} />);
    const node = screen.getByTestId('participant-node');
    fireEvent.mouseDown(node);
    expect(node).toHaveClass('dragging');
  });
});
```

### Backend Test Example

```python
import pytest
from backend.cache import Cache

@pytest.fixture
def cache():
    return Cache()

class TestCache:
    def test_cache_stores_value(self, cache):
        """Test cache stores and retrieves values."""
        cache.set('key1', 'value1', ttl=3600)
        assert cache.get('key1') == 'value1'

    def test_cache_respects_ttl(self, cache):
        """Test cache respects TTL and expires."""
        cache.set('key2', 'value2', ttl=1)
        assert cache.get('key2') == 'value2'

        # Wait for expiration
        import time
        time.sleep(1.1)
        assert cache.get('key2') is None

    @pytest.mark.asyncio
    async def test_async_cache_operations(self, cache):
        """Test async cache operations."""
        await cache.async_set('key3', 'value3')
        result = await cache.async_get('key3')
        assert result == 'value3'
```

---

## Coverage Requirements

### Current Coverage

| Module | Coverage | Status |
|--------|----------|--------|
| agent_roles.py | 85% | ✅ Good |
| cache.py | 82% | ✅ Good |
| resilience.py | 78% | ✅ Good |
| UI Components | 65% | ⚠️ Fair |
| API Routes | 45% | ❌ Needs Work |
| Storage | 72% | ✅ Good |
| **Overall** | **70%** | **Fair** |

### Target Coverage

- **Critical paths:** 95%+ (council execution, API routes)
- **Core modules:** 85%+ (business logic)
- **Utilities:** 80%+
- **UI Components:** 70%+
- **Overall:** 80%+

### Generate Coverage Report

**Frontend:**
```bash
cd frontend && npm run test:coverage
# Open coverage/index.html
```

**Backend:**
```bash
pytest tests/ --cov=backend --cov-report=html
# Open htmlcov/index.html
```

---

## Test Categories

### Unit Tests (60%)

**Purpose:** Test individual components in isolation
**Framework:** Vitest (frontend), Pytest (backend)
**Examples:**
- Cache: `test_cache.py`
- Agent Roles: `test_agent_roles.py`
- Resilience: `test_resilience.py`
- Utils: helpers, presets

**Best Practices:**
- One assertion per test (or tightly related)
- Mock external dependencies
- Use fixtures for test data
- Clear, descriptive names

### Integration Tests (35%)

**Purpose:** Test how modules work together
**Status:** Currently minimal (needs expansion)
**Planned Areas:**
- Council execution pipeline (stages 1-3)
- API endpoints with real database
- WebSocket communication
- Cache with actual API calls

**Example Structure:**
```python
@pytest.mark.integration
class TestCouncilExecution:
    def test_full_council_pipeline(self, client):
        """Test complete council execution."""
        # Stage 1: Get independent responses
        responses = client.post('/council/execute', json=...)
        assert len(responses) == 3

        # Stage 2: Get peer reviews
        reviews = client.post('/council/review', json=...)
        assert all(r.get('score') for r in reviews)

        # Stage 3: Get synthesis
        synthesis = client.post('/council/synthesize', json=...)
        assert synthesis['final_answer']
```

### End-to-End Tests (5%)

**Purpose:** Test complete user workflows
**Status:** Not yet implemented
**Tools:** Playwright (recommended)
**Planned Scenarios:**
- Create council from UI
- Submit query
- Watch real-time responses
- View synthesis
- Save conversation
- Review history

**Example Structure:**
```python
from playwright.sync_api import expect

def test_create_and_execute_council(page):
    """Test user creates council and gets response."""
    page.goto('http://localhost:5173')

    # Create council
    page.click('[data-testid="create-council"]')
    page.fill('[data-testid="query-input"]', 'What is AI?')
    page.click('[data-testid="submit-query"]')

    # Wait for responses
    expect(page.locator('[data-testid="response-1"]')).to_have_text(
        /AI is/, timeout=10000
    )
```

---

## Async Testing

### Frontend Async Tests

```javascript
it('should handle async state updates', async () => {
  render(<CouncilCanvas />);

  // Trigger async operation
  fireEvent.click(screen.getByText('Execute'));

  // Wait for completion
  await waitFor(() => {
    expect(screen.getByText(/Response received/)).toBeInTheDocument();
  }, { timeout: 5000 });
});
```

### Backend Async Tests

```python
@pytest.mark.asyncio
async def test_async_council_execution():
    """Test async council execution."""
    council = Council(participants=['gpt-4', 'claude-3', 'gemini-2'])

    # Execute stages concurrently
    responses = await council.stage1_independent_responses('question')
    reviews = await council.stage2_peer_reviews(responses)
    synthesis = await council.stage3_synthesis(reviews)

    assert synthesis.final_answer
```

---

## Mocking & Fixtures

### Frontend Fixtures

```javascript
// src/test/fixtures.js
export const mockCouncilData = {
  participants: ['gpt-4', 'claude-3', 'gemini-2'],
  responses: [
    { id: '1', text: 'Response 1', score: 8 },
    { id: '2', text: 'Response 2', score: 7 },
    { id: '3', text: 'Response 3', score: 9 }
  ]
};

export const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn()
};
```

### Backend Fixtures

```python
# tests/conftest.py
import pytest
from backend.cache import Cache
from backend.agent_roles import AgentRoles

@pytest.fixture
def cache():
    """Provide clean cache for each test."""
    c = Cache()
    yield c
    c.clear()

@pytest.fixture
def mock_openrouter():
    """Mock OpenRouter API responses."""
    with patch('backend.openrouter.OpenRouter') as mock:
        mock.return_value.query.return_value = {
            'response': 'test response',
            'tokens': 100
        }
        yield mock

@pytest.fixture
def sample_council_data():
    """Provide sample council configuration."""
    return {
        'query': 'What is AI?',
        'participants': ['gpt-4', 'claude-3', 'gemini-2'],
        'chairman': 'claude-opus'
    }
```

---

## CI/CD Integration

### GitHub Actions Setup

```yaml
name: Tests

on: [push, pull_request]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd frontend && npm install && npm test

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r requirements-test.txt
      - run: pytest tests/ -v --cov
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Setup hooks
pre-commit install
```

`.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: frontend-tests
        name: Frontend Tests
        entry: npm test
        language: system
        pass_filenames: false
        stages: [commit]
```

---

## Debugging Tests

### Frontend Debugging

```javascript
// Add debug output
it('should work', () => {
  const { debug } = render(<Component />);
  debug(); // Print DOM

  // Or use screen
  screen.debug();
});

// Use testing-library queries
screen.getByRole('button', { name: /submit/i });
screen.getByTestId('submit-button');
screen.getByLabelText('Query:');
```

**VS Code Setup:**
```json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/frontend/node_modules/.bin/vitest",
  "args": ["--run"],
  "console": "integratedTerminal"
}
```

### Backend Debugging

```python
# Add debug output
def test_example():
    result = function_under_test()
    print(f"Result: {result}")  # Will show with pytest -s
    assert result == expected

# Run with output
pytest tests/ -v -s

# Drop into debugger
import pdb; pdb.set_trace()

# Or use pytest's debugging
pytest --pdb
```

**VS Code Setup:**
```json
{
  "name": "Python: Pytest",
  "type": "python",
  "request": "launch",
  "module": "pytest",
  "args": ["tests/", "-v"],
  "console": "integratedTerminal"
}
```

---

## Common Issues & Solutions

### Frontend Issues

**Issue:** Vitest timeout (30s default)
```javascript
// Solution: Increase timeout in vitest.config.js
test: {
  testTimeout: 60000, // 60 seconds
  hookTimeout: 60000
}
```

**Issue:** WebSocket tests fail
```javascript
// Solution: Mock WebSocket
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn()
}));
```

### Backend Issues

**Issue:** Async test hangs
```python
# Solution: Mark with @pytest.mark.asyncio
@pytest.mark.asyncio
async def test_async_function():
    pass
```

**Issue:** External API calls fail
```python
# Solution: Mock the API
@patch('backend.openrouter.OpenRouter.query')
def test_with_mocked_api(mock_query):
    mock_query.return_value = {'response': 'test'}
```

---

## Performance Testing

### Frontend Performance

```javascript
it('should render quickly', () => {
  const start = performance.now();
  render(<CouncilCanvas />);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000); // 1 second
});
```

### Backend Performance

```python
import pytest
from unittest.mock import patch
import time

@pytest.mark.performance
def test_council_execution_speed():
    """Council should execute within 5 seconds."""
    start = time.time()
    council.execute()
    duration = time.time() - start
    assert duration < 5.0
```

---

## Best Practices

### Do's ✅

- Write tests as you write code
- Use descriptive test names
- One responsibility per test
- Mock external dependencies
- Use fixtures for test data
- Keep tests DRY
- Test edge cases
- Use assertions wisely

### Don'ts ❌

- Share state between tests
- Write tests for tests
- Mock everything
- Make tests too specific
- Hardcode test data
- Skip flaky tests without fixing
- Test implementation details
- Write tests that depend on timing

---

## Continuous Improvement

### Monthly Test Review

1. **Coverage:** Check coverage reports
2. **Flakiness:** Review test failures
3. **Performance:** Compare execution times
4. **Gaps:** Identify untested code

### Quarterly Goals

- Increase coverage by 5-10%
- Reduce test execution time by 10%
- Eliminate flaky tests
- Add new test categories

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Pytest Documentation](https://docs.pytest.org/)
- [Playwright](https://playwright.dev/)

---

**Last Updated:** December 16, 2025
**Maintainer:** AI Council Team
