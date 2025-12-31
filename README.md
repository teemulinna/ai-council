# AI Council

![AI Council](header.png)

**Multiple minds. One answer.**

AI Council is a local web application that queries multiple Large Language Models simultaneously, has them peer-review each other's responses, and synthesizes a final answer through a designated Chairman. Instead of asking one AI, ask a council.

## Why AI Council?

- **Reduce bias** — Different models have different training data and perspectives
- **Improve accuracy** — Cross-validation catches errors individual models might make
- **Get comprehensive answers** — Synthesis combines the best of all responses
- **Compare models** — See how GPT-4, Claude, Gemini, and others approach the same question

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR QUESTION                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: INDEPENDENT RESPONSES                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  GPT-4  │  │ Claude  │  │ Gemini  │  │ Llama   │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                  │
│       ▼            ▼            ▼            ▼                  │
│   Response A   Response B   Response C   Response D             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: PEER REVIEW                                           │
│  Each model ranks the OTHER responses (anonymized)              │
│  "Response 2 is most accurate because..."                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: SYNTHESIS                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CHAIRMAN MODEL                        │   │
│  │  Integrates all perspectives + rankings into one answer  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINAL ANSWER                               │
│  Comprehensive, cross-validated, synthesized response           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| OpenRouter API Key | - | [Get free key](https://openrouter.ai/keys) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ai-council.git
cd ai-council

# 2. Run setup (creates .env, installs dependencies, initializes database)
./scripts/setup.sh

# 3. Add your OpenRouter API key
nano .env
# Change: OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

### Run

```bash
./start.sh
```

Open **http://localhost:3847** in your browser.

### Manual Start (Alternative)

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
python main.py

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## Using AI Council

### 1. Choose a Preset or Build Custom

**Presets** — Ready-made council configurations:

| Preset | Description | Best For |
|--------|-------------|----------|
| **Simple Discussion** | 3 models + chairman | Quick questions |
| **Debate Council** | Pro vs Con + moderator | Controversial topics |
| **Expert Panel** | Technical, Business, Legal, Creative | Complex decisions |
| **Devil's Advocate** | Challenge-response format | Stress-testing ideas |
| **Research Council** | 7 diverse perspectives | Deep analysis |

**Custom** — Build your own council from scratch:
- Click **Edit** → **Models** tab to see all 200+ available models
- Drag models onto the canvas to add them
- Click any model to configure its role, system prompt, and personality
- Designate one model as **Chairman** to synthesize the final answer
- Save your custom configuration for reuse

### 2. Ask Your Question

Type your question in the input bar at the bottom and press Enter or click Run.

### 3. Watch the Council Work

- **Stage 1**: See each model's response stream in real-time
- **Stage 2**: View peer rankings and reasoning
- **Stage 3**: Get the synthesized final answer

### 4. Review History

Click the History icon to:
- View past council sessions
- Replay previous configurations
- See cost and token usage

---

## Configuration

### Environment Variables (.env)

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional
PORT=8347                              # Backend port
HOST=0.0.0.0                           # Bind address
CORS_ORIGINS=http://localhost:3847     # Frontend URL
MAX_BUDGET=10.0                        # Max spend per hour (USD)
```

### Available Models

AI Council uses [OpenRouter](https://openrouter.ai/) which provides access to 200+ models. Models are fetched live, so you always have access to the latest releases:

| Provider | Current Models (Dec 2025) |
|----------|---------------------------|
| OpenAI | GPT-4.5, o3, o3-mini, GPT-4o |
| Anthropic | Claude 4 Opus, Claude 4 Sonnet, Claude 3.5 Sonnet |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash |
| Meta | Llama 4 405B, Llama 3.3 70B |
| Mistral | Mistral Large 2, Codestral |
| xAI | Grok 3, Grok 3 mini |
| DeepSeek | DeepSeek V3, DeepSeek R1 |
| And many more... | See [OpenRouter Models](https://openrouter.ai/models) |

### Building Custom Councils

In **Edit mode**, you have full control over your council:

**Adding Models:**
- Click **Models** tab in the sidebar
- Browse or search 200+ available models
- Drag any model onto the canvas
- Each model shows estimated cost per query

**Configuring Participants:**
- Click any model node to open settings
- Set a **Display Name** and **Role** (Analyst, Devil's Advocate, etc.)
- Write a **System Prompt** to define behavior
- Adjust **Temperature** (0.0 = focused, 1.0 = creative)

**Removing Models:**
- Select a node and press Delete, or
- Right-click and choose Remove

**Designating Chairman:**
- Click a model node → Set as Chairman
- The Chairman synthesizes all responses into the final answer

---

## Features

| Feature | Description |
|---------|-------------|
| **Visual Council Builder** | Drag-and-drop canvas to design custom councils |
| **Real-time Streaming** | Watch responses arrive live via WebSocket |
| **Peer Review Rankings** | See how models rate each other's responses |
| **Conversation History** | Review and replay past council sessions |
| **Cost Tracking** | Token usage and estimated costs per query |
| **Rate Limiting** | Built-in protection against API overuse |
| **Prompt Injection Defense** | Security against malicious inputs |
| **PII Redaction** | Sensitive data automatically redacted from logs |

---

## Project Structure

```
ai-council/
├── backend/                 # Python FastAPI server
│   ├── main.py              # API endpoints & WebSocket
│   ├── council.py           # Council execution orchestration
│   ├── openrouter.py        # OpenRouter API client
│   ├── database.py          # SQLite operations
│   ├── security.py          # Prompt injection defense, PII redaction
│   ├── rate_limiter.py      # Request & cost limiting
│   ├── requirements.txt     # Python dependencies
│   └── data/                # SQLite database (gitignored)
│
├── frontend/                # React 19 application
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── canvas/      # ReactFlow council builder
│   │   │   ├── panels/      # Side panels (config, history, results)
│   │   │   └── layout/      # Header, navigation
│   │   ├── stores/          # Zustand state management
│   │   └── utils/           # Helpers & preset definitions
│   └── package.json
│
├── scripts/
│   ├── setup.sh             # Initial setup script
│   ├── backup-data.sh       # Backup local database
│   └── reset-data.sh        # Reset to fresh state
│
├── docs/
│   └── SECURITY_REPORT.md   # OWASP security audit
│
├── start.sh                 # Launch both servers
├── .env.example             # Environment template
└── .gitignore               # Excludes data, logs, .env
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | FastAPI | Async API server |
| **Frontend** | React 19 + Vite | Modern UI framework |
| **State** | Zustand | Lightweight state management |
| **Canvas** | ReactFlow | Visual node-based builder |
| **Animation** | Framer Motion | Smooth UI transitions |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **API** | OpenRouter | Unified LLM access |
| **Database** | SQLite | Local conversation storage |
| **WebSocket** | FastAPI WS | Real-time streaming |

---

## Troubleshooting

### "OPENROUTER_API_KEY not configured"

```bash
# Check if .env exists and has valid key
cat .env | grep OPENROUTER

# Key should look like: sk-or-v1-abc123...
# NOT: sk-or-v1-your-key-here
```

### "Port already in use"

```bash
# Kill process on port 8347 (backend)
lsof -ti:8347 | xargs kill -9

# Kill process on port 3847 (frontend)
lsof -ti:3847 | xargs kill -9
```

### "Module not found" errors

```bash
# Reinstall backend dependencies
cd backend && pip install -r requirements.txt

# Reinstall frontend dependencies
cd frontend && rm -rf node_modules && npm install
```

### Frontend shows "Cannot connect to backend"

1. Ensure backend is running on port 8347
2. Check CORS_ORIGINS in .env matches frontend URL
3. Look for errors in backend terminal

### Responses are slow

- OpenRouter routes to the fastest available provider
- Some models (GPT-4, Claude Opus) are naturally slower
- Check your internet connection
- Try budget-tier models for faster responses

---

## Testing

```bash
# All tests
cd frontend && npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test -- --watch
```

**Test Coverage:** 90/90 tests passing

---

## Security

AI Council includes several security features:

- **Prompt Injection Defense** — Detects and blocks injection attempts
- **PII Redaction** — Emails, phones, SSNs automatically redacted from logs
- **Rate Limiting** — Prevents API abuse (requests/minute, cost/hour)
- **Input Validation** — Max length, sanitization
- **Parameterized SQL** — No SQL injection vulnerabilities
- **Security Headers** — X-Frame-Options, X-Content-Type-Options, etc.

See [docs/SECURITY_REPORT.md](docs/SECURITY_REPORT.md) for the full OWASP audit.

---

## Cost Management

OpenRouter pricing varies by model. Typical costs (December 2025):

| Model Tier | Cost per 1M tokens | Example Models |
|------------|-------------------|----------------|
| Budget | $0.05-0.30 | Llama 3.3 8B, Gemini 2.5 Flash, DeepSeek V3 |
| Standard | $0.50-3 | GPT-4o, Claude 3.5 Sonnet, Grok 3 mini |
| Premium | $5-30 | GPT-4.5, Claude 4 Opus, o3 |
| Reasoning | $15-60 | o3, DeepSeek R1 |

AI Council shows estimated costs per council in the Edit sidebar. Set `MAX_BUDGET` in .env to limit hourly spending.

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) for unified LLM API access
- [ReactFlow](https://reactflow.dev/) for the visual builder
- [Framer Motion](https://www.framer.com/motion/) for animations
- Built with Claude, GPT-4, and Gemini collaboration

---

**Questions?** Open an issue or start a discussion.

**Like this project?** Give it a star!
