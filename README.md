# AI Council

![AI Council](header.jpg)

**Multiple minds. One answer.**

AI Council is a local web app that sends your question to multiple LLMs simultaneously, has them review each other's responses, and synthesizes a final answer through a designated Chairman. Instead of asking one AI, ask a council.

## How It Works

1. **Stage 1: Independent Responses** — Your query goes to all selected LLMs. Each responds without seeing the others.

2. **Stage 2: Peer Review** — Each LLM receives anonymized responses from the others and ranks them by quality.

3. **Stage 3: Synthesis** — The Chairman LLM integrates all perspectives into a single, comprehensive answer.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [OpenRouter API key](https://openrouter.ai/)

### Setup

```bash
# Clone and enter
git clone https://github.com/yourusername/ai-council.git
cd ai-council

# Install backend
uv sync

# Install frontend
cd frontend && npm install && cd ..

# Configure API key
echo "OPENROUTER_API_KEY=sk-or-v1-your-key" > .env
```

### Run

```bash
./start.sh
```

Open [http://localhost:5173](http://localhost:5173)

## Council Presets

| Preset | Description | Participants |
|--------|-------------|--------------|
| 💬 **Simple Discussion** | Quick 3-way discussion with synthesis | 3 + Chairman |
| ⚔️ **Debate Council** | Pro vs Con with moderator and judge | 4 |
| 🎓 **Expert Panel** | Technical, Business, Legal, Creative experts | 5 |
| 😈 **Devil's Advocate** | Challenge-response stress testing | 4 |
| 🔬 **Research Council** | Deep multi-perspective analysis | 7 |

## Features

- **Visual Council Builder** — Drag-and-drop canvas to design custom councils
- **Real-time Streaming** — Watch responses arrive live via WebSocket
- **Conversation History** — Review and replay past council sessions
- **Cost Tracking** — See token usage and estimated costs per query
- **Customizable Prompts** — Fine-tune each participant's role and behavior

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python 3.10+, async httpx |
| Frontend | React 18, Vite, ReactFlow, Framer Motion, Zustand |
| API | OpenRouter (unified access to OpenAI, Anthropic, Google, etc.) |
| Storage | JSON files in `data/conversations/` |

## Configuration

Edit `backend/config.py` to customize default models:

```python
COUNCIL_MODELS = [
    "openai/gpt-4.1",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.0-flash",
]
CHAIRMAN_MODEL = "anthropic/claude-opus-4"
```

## Project Structure

```
ai-council/
├── backend/           # FastAPI server
│   ├── main.py        # API endpoints & WebSocket
│   ├── council.py     # Council execution logic
│   └── openrouter.py  # OpenRouter API client
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── stores/        # Zustand state
│   │   └── utils/         # Helpers & presets
│   └── package.json
├── start.sh           # Launch script
└── .env               # API keys (create this)
```

## Origin

This project was vibe-coded as an exploration tool for evaluating multiple LLMs side by side. Built to see how different models approach the same question and what emerges when they review each other's work.

## License

MIT
