# AI Council - Technical Documentation

> For developers and contributors. User-facing documentation is in the main README.

## Architecture Overview

```
ai-council/
├── Backend (FastAPI + Python 3.10+)
│   ├── main.py              # Core API & WebSocket orchestration
│   ├── openrouter.py        # OpenRouter API client (unified LLM access)
│   ├── council.py           # Council execution logic
│   ├── database.py          # SQLite persistence layer
│   ├── reasoning_patterns.py # Cognitive patterns for council members
│   ├── agent_roles.py       # Role definitions & personalities
│   ├── cost_tracker.py      # Token usage & cost analytics
│   ├── cache.py             # Response caching
│   └── resilience.py        # Fallback strategies
│
├── Frontend (React 19 + Vite)
│   ├── App.jsx              # Main application shell
│   ├── components/
│   │   ├── canvas/          # ReactFlow-based visual builder
│   │   ├── panels/          # Configuration & results panels
│   │   └── __tests__/       # Component tests
│   ├── stores/              # Zustand state management
│   └── api.js               # WebSocket client
│
└── Infrastructure
    ├── Docker & docker-compose
    ├── start.sh             # Smart startup orchestration
    └── Tests (90/90 passing)
```

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Backend | FastAPI | Async native, WebSocket support, auto-docs |
| Frontend | React 19 + Vite | Fast HMR, modern React features |
| Visual Builder | ReactFlow 12.x | Battle-tested node graph library |
| State | Zustand | Lightweight, no boilerplate |
| Styling | Tailwind CSS | Utility-first, consistent |
| LLM Access | OpenRouter | Single API for all models |
| Database | SQLite | Zero-config, portable |
| Testing | Vitest + Pytest | Fast, modern test runners |

## Key Design Decisions

### 1. OpenRouter Abstraction
Single API endpoint for Claude, GPT-4, Gemini, Llama, DeepSeek. Automatic pricing, model discovery, and fallback handling.

### 2. Topological Execution
Uses Kahn's algorithm for DAG execution order. Supports arbitrary topologies, not just tree structures.

### 3. WebSocket Streaming
Real-time token streaming with live cost calculation. No polling - instant updates.

### 4. SQLite + JSON
Lightweight persistence with JSON blobs for flexibility. Good for single-user/small-team. Replace with PostgreSQL for scale.

## Port Configuration

- Frontend: `3847` (non-standard to avoid conflicts)
- Backend: `8347` (non-standard to avoid conflicts)

## Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-v1-...  # Required
LOG_LEVEL=INFO                    # Optional: DEBUG, INFO, WARNING, ERROR
```

## Development Commands

```bash
# Backend
uv sync                    # Install Python dependencies
uv run python main.py      # Start backend

# Frontend
cd frontend && npm install # Install Node dependencies
npm run dev               # Start frontend dev server

# Testing
npm test                  # Frontend tests (Vitest)
pytest                    # Backend tests (Pytest)

# Docker
./start.sh --docker       # Run everything in containers
```

## Known Issues & Technical Debt

See `/docs/CODE_REVIEW_REPORT.md` for full analysis.

**Critical (fix before production):**
1. WebSocket memory leak - add cleanup on unmount
2. Input validation missing on WebSocket endpoint
3. CORS overly permissive
4. No rate limiting

**Major:**
1. No React Error Boundaries
2. Missing request cancellation (AbortController)
3. Store hydration potential issues

## Testing Strategy

- **Unit tests**: Component logic, utility functions
- **Integration tests**: API endpoints, WebSocket flow
- **E2E tests**: (TODO) Full user journeys with Playwright

Current coverage: ~70% (target: 80%)

## Contributing

1. Fork the repository
2. Create feature branch
3. Write tests first (TDD)
4. Submit PR with clear description

## File Organization Rules

- `/src` - Source code files (when applicable)
- `/tests` - Test files
- `/docs` - Documentation
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

Never save working files to root folder.
