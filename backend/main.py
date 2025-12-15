"""FastAPI backend for AI Council - Visual Council Builder."""

import os
import logging
import sys
import json
import asyncio
import uuid
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

try:
    from .openrouter import query_model, query_models_parallel, fetch_available_models
    from .config import COUNCIL_MODELS, CHAIRMAN_MODEL, MODEL_PROVIDERS, MODEL_PRICING
    from . import database as db
    from . import reasoning_patterns as patterns
except ImportError:
    from openrouter import query_model, query_models_parallel, fetch_available_models
    from config import COUNCIL_MODELS, CHAIRMAN_MODEL, MODEL_PROVIDERS, MODEL_PRICING
    import database as db
    import reasoning_patterns as patterns

# Load environment variables
load_dotenv()

# Port configuration
PORT = int(os.getenv("PORT", "8347"))
HOST = os.getenv("HOST", "0.0.0.0")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3847").split(",")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

app = FastAPI(title="AI Council API - Visual Builder")

logger.info(f"🏛️ AI Council API starting on port {PORT}...")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Pydantic Models ===

class ParticipantConfig(BaseModel):
    """Configuration for a council participant."""
    id: str
    model: str
    displayName: str
    role: str
    systemPrompt: Optional[str] = ""
    temperature: Optional[float] = 0.7
    speakingOrder: int
    provider: str
    isChairman: bool = False


class EdgeConfig(BaseModel):
    """Configuration for an edge between nodes."""
    id: str
    source: str
    target: str


class CouncilConfig(BaseModel):
    """Full council configuration from the visual builder."""
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class ExecuteRequest(BaseModel):
    """Request to execute a council query."""
    query: str
    config: CouncilConfig


# === Available Models & Roles ===

AVAILABLE_MODELS = [
    # Anthropic Claude 4.5 series
    {"id": "anthropic/claude-opus-4.5", "name": "Claude Opus 4.5", "provider": "anthropic", "tier": "premium"},
    {"id": "anthropic/claude-sonnet-4.5", "name": "Claude Sonnet 4.5", "provider": "anthropic", "tier": "standard"},
    {"id": "anthropic/claude-haiku-4.5", "name": "Claude Haiku 4.5", "provider": "anthropic", "tier": "budget"},
    # OpenAI GPT-5 series
    {"id": "openai/gpt-5.2", "name": "GPT-5.2", "provider": "openai", "tier": "standard"},
    {"id": "openai/gpt-5.2-pro", "name": "GPT-5.2 Pro", "provider": "openai", "tier": "premium"},
    {"id": "openai/gpt-5.2-chat", "name": "ChatGPT 5.2", "provider": "openai", "tier": "standard"},
    # Google Gemini
    {"id": "google/gemini-3-pro-preview", "name": "Gemini 3 Pro", "provider": "google", "tier": "premium"},
    {"id": "google/gemini-2.5-flash-preview-09-2025", "name": "Gemini 2.5 Flash", "provider": "google", "tier": "budget"},
    # DeepSeek v3.2
    {"id": "deepseek/deepseek-v3.2", "name": "DeepSeek V3.2", "provider": "deepseek", "tier": "budget"},
    {"id": "deepseek/deepseek-v3.2-speciale", "name": "DeepSeek V3.2 Speciale", "provider": "deepseek", "tier": "standard"},
    # Meta Llama via NVIDIA
    {"id": "nvidia/llama-3.3-nemotron-super-49b-v1.5", "name": "Llama 3.3 49B", "provider": "meta", "tier": "budget"},
]

AVAILABLE_ROLES = [
    {"id": "responder", "name": "Primary Responder", "description": "Provides comprehensive main answers", "icon": "💬",
     "prompt": "You are a helpful AI assistant. Provide a comprehensive, accurate response to the user's question."},
    {"id": "devil_advocate", "name": "Devil's Advocate", "description": "Challenges assumptions and finds weaknesses", "icon": "😈",
     "prompt": "You are a devil's advocate. Challenge assumptions, find weaknesses in arguments, and present counterarguments. Be constructively critical."},
    {"id": "fact_checker", "name": "Fact Checker", "description": "Verifies accuracy and flags uncertainties", "icon": "🔍",
     "prompt": "You are a fact checker. Focus on accuracy, verify claims, and clearly flag any uncertainties or areas that need verification."},
    {"id": "creative", "name": "Creative Thinker", "description": "Offers unconventional perspectives", "icon": "💡",
     "prompt": "You are a creative thinker. Offer unconventional perspectives, think outside the box, and suggest innovative approaches."},
    {"id": "practical", "name": "Practical Advisor", "description": "Focuses on real-world applications", "icon": "🛠️",
     "prompt": "You are a practical advisor. Focus on real-world applications, feasibility, and actionable recommendations."},
    {"id": "expert", "name": "Domain Expert", "description": "Provides specialized knowledge", "icon": "🎓",
     "prompt": "You are a domain expert. Provide specialized, in-depth knowledge and technical insights."},
    {"id": "synthesizer", "name": "Synthesizer", "description": "Combines insights from all perspectives", "icon": "🔗",
     "prompt": "You are a synthesizer. Combine and integrate insights from multiple perspectives into a coherent whole."},
    {"id": "chairman", "name": "Chairman", "description": "Final synthesis and decision making", "icon": "👑",
     "prompt": "You are the Chairman of an AI Council. Synthesize all inputs into a comprehensive final answer that represents the council's collective wisdom."},
]


# === REST Endpoints ===

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "AI Council Visual Builder API"}


@app.get("/api/models")
async def list_models(refresh: bool = False):
    """List available AI models with caching."""
    # Check cache age (refresh if older than 24 hours or forced)
    cache_age = db.get_cache_age()
    should_refresh = refresh or cache_age is None or (datetime.now() - cache_age) > timedelta(hours=24)

    if not should_refresh:
        cached = db.get_cached_models()
        if cached:
            logger.info(f"Returning {len(cached)} cached models")
            return {"models": cached, "cached": True, "cache_age": cache_age.isoformat() if cache_age else None}

    # Fetch fresh models from OpenRouter
    logger.info("Fetching models from OpenRouter API...")
    raw_models = await fetch_available_models()

    if not raw_models:
        # Fall back to cache or static list
        cached = db.get_cached_models()
        if cached:
            return {"models": cached, "cached": True, "error": "Failed to fetch fresh models"}
        return {"models": AVAILABLE_MODELS, "cached": False, "error": "Using static fallback"}

    # Transform and filter models
    models = []
    for m in raw_models:
        model_id = m.get('id', '')
        # Filter to popular/useful models
        if any(provider in model_id for provider in ['anthropic/', 'openai/', 'google/', 'deepseek/', 'meta-llama/', 'nvidia/']):
            # Determine tier based on pricing
            pricing = m.get('pricing', {})
            prompt_price = float(pricing.get('prompt', '0') or '0')
            if prompt_price > 10:
                tier = 'premium'
            elif prompt_price > 1:
                tier = 'standard'
            else:
                tier = 'budget'

            # Extract provider
            provider = model_id.split('/')[0] if '/' in model_id else 'other'
            if provider == 'meta-llama':
                provider = 'meta'

            models.append({
                'id': model_id,
                'name': m.get('name', model_id),
                'provider': provider,
                'tier': tier,
                'context_length': m.get('context_length', 0),
                'pricing': {
                    'input': float(pricing.get('prompt', '0') or '0'),
                    'output': float(pricing.get('completion', '0') or '0')
                }
            })

    # Sort by provider and name
    models.sort(key=lambda x: (x['provider'], x['name']))

    # Cache the models
    db.cache_models(models)
    logger.info(f"Cached {len(models)} models from OpenRouter")

    return {"models": models, "cached": False}


@app.get("/api/roles")
async def list_roles():
    """List available participant roles including custom roles."""
    custom_roles = db.get_custom_roles()
    all_roles = AVAILABLE_ROLES + custom_roles
    return {"roles": all_roles}


@app.post("/api/roles")
async def create_role(role: Dict[str, Any]):
    """Create a custom role."""
    role_id = role.get('id') or f"custom_{uuid.uuid4().hex[:8]}"
    role['id'] = role_id
    db.add_custom_role(role)
    logger.info(f"Created custom role: {role['name']}")
    return {"id": role_id, "success": True}


@app.delete("/api/roles/{role_id}")
async def delete_role(role_id: str):
    """Delete a custom role."""
    db.delete_custom_role(role_id)
    logger.info(f"Deleted custom role: {role_id}")
    return {"success": True}


# === Reasoning Patterns Endpoints ===

@app.get("/api/patterns")
async def list_patterns(category: Optional[str] = None):
    """List available reasoning patterns."""
    if category:
        pattern_list = patterns.get_patterns_by_category(category)
    else:
        pattern_list = patterns.get_all_patterns()
    return {
        "patterns": pattern_list,
        "categories": patterns.get_categories()
    }


@app.get("/api/patterns/{pattern_id}")
async def get_pattern(pattern_id: str):
    """Get a specific reasoning pattern."""
    pattern = patterns.get_pattern_by_id(pattern_id)
    return {"pattern": pattern}


@app.post("/api/execute")
async def execute_council(request: ExecuteRequest):
    """Execute a council query (non-streaming fallback)."""
    # This is a fallback for non-WebSocket clients
    # The main execution happens via WebSocket
    return {"message": "Use WebSocket at /ws/execute for real-time execution"}


# === Favourites Endpoints ===

@app.get("/api/favourites")
async def get_favourites():
    """Get favourite model IDs."""
    return {"favourites": db.get_favourite_models()}


@app.post("/api/favourites/{model_id:path}")
async def add_favourite(model_id: str):
    """Add a model to favourites."""
    db.add_favourite_model(model_id)
    logger.info(f"Added favourite: {model_id}")
    return {"success": True}


@app.delete("/api/favourites/{model_id:path}")
async def remove_favourite(model_id: str):
    """Remove a model from favourites."""
    db.remove_favourite_model(model_id)
    logger.info(f"Removed favourite: {model_id}")
    return {"success": True}


# === Settings Endpoints ===

@app.get("/api/settings")
async def get_all_settings():
    """Get all settings."""
    keys = ['defaultModel', 'defaultTemperature', 'theme', 'autoSave']
    settings = {k: db.get_setting(k) for k in keys}
    return {"settings": settings}


@app.get("/api/settings/{key}")
async def get_setting(key: str):
    """Get a specific setting."""
    value = db.get_setting(key)
    return {"key": key, "value": value}


@app.put("/api/settings/{key}")
async def set_setting(key: str, body: Dict[str, Any]):
    """Set a setting value."""
    value = body.get('value')
    db.set_setting(key, value)
    logger.info(f"Updated setting: {key}")
    return {"success": True}


# === History Endpoints ===

@app.get("/api/history")
async def get_history(limit: int = 50):
    """Get conversation history."""
    conversations = db.get_conversations(limit)
    return {"conversations": conversations}


@app.post("/api/history")
async def save_conversation(conv: Dict[str, Any]):
    """Save a conversation."""
    conv_id = conv.get('id') or str(uuid.uuid4())
    conv['id'] = conv_id
    db.save_conversation(conv)
    logger.info(f"Saved conversation: {conv_id}")
    return {"id": conv_id, "success": True}


@app.delete("/api/history/{conv_id}")
async def delete_history(conv_id: str):
    """Delete a conversation."""
    db.delete_conversation(conv_id)
    logger.info(f"Deleted conversation: {conv_id}")
    return {"success": True}


# === Execution Logs Endpoints ===

@app.get("/api/logs/{conv_id}")
async def get_logs(conv_id: str, round_number: Optional[int] = None):
    """Get execution logs for a conversation."""
    logs = db.get_execution_logs(conv_id, round_number)
    return {"logs": logs}


@app.get("/api/logs/{conv_id}/rounds")
async def get_rounds(conv_id: str):
    """Get all round numbers for a conversation."""
    rounds = db.get_rounds_for_conversation(conv_id)
    return {"rounds": rounds}


@app.get("/api/logs/{conv_id}/decision-tree")
async def get_decision_tree(conv_id: str, round_number: Optional[int] = None):
    """Get decision tree for a conversation."""
    tree = db.get_decision_tree(conv_id, round_number)
    return {"tree": tree}


# === WebSocket Execution ===

class CouncilExecutor:
    """Handles council execution with WebSocket streaming and logging."""

    def __init__(self, websocket: WebSocket):
        self.ws = websocket
        self.total_tokens = 0
        self.total_cost = 0.0
        self.conversation_id = str(uuid.uuid4())
        self.round_number = 1
        self.parent_node_id = None

    async def send(self, msg_type: str, **data):
        """Send a message through the WebSocket."""
        # Include conversation_id for client-side tracking
        await self.ws.send_json({"type": msg_type, "conversationId": self.conversation_id, **data})

    def log_execution(self, stage: str, node_id: str = None, node_name: str = None,
                      model: str = None, role: str = None, input_content: str = None,
                      output_content: str = None, tokens: int = 0, cost: float = 0.0,
                      duration_ms: int = 0):
        """Log an execution step to the database."""
        db.log_execution({
            'conversation_id': self.conversation_id,
            'round_number': self.round_number,
            'stage': stage,
            'node_id': node_id,
            'node_name': node_name,
            'model': model,
            'role': role,
            'input_content': input_content,
            'output_content': output_content,
            'tokens_used': tokens,
            'cost': cost,
            'duration_ms': duration_ms
        })

    def log_decision(self, node_id: str, decision_type: str, decision_data: Dict = None):
        """Log a decision in the tree."""
        db.log_decision({
            'conversation_id': self.conversation_id,
            'round_number': self.round_number,
            'parent_node_id': self.parent_node_id,
            'node_id': node_id,
            'decision_type': decision_type,
            'decision_data': decision_data or {}
        })
        self.parent_node_id = node_id

    def get_role_prompt(self, role_id: str) -> str:
        """Get the system prompt for a role."""
        for role in AVAILABLE_ROLES:
            if role["id"] == role_id:
                return role["prompt"]
        return AVAILABLE_ROLES[0]["prompt"]

    def calculate_cost(self, model: str, usage: Dict) -> float:
        """Calculate cost for a model response."""
        if model in MODEL_PRICING:
            pricing = MODEL_PRICING[model]
            input_cost = (usage.get('prompt_tokens', 0) / 1_000_000) * pricing['input']
            output_cost = (usage.get('completion_tokens', 0) / 1_000_000) * pricing['output']
            return round(input_cost + output_cost, 6)
        return 0.0

    def build_execution_graph(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """
        Build execution graph from nodes and edges.

        Returns:
            Dict with:
            - node_map: id -> node
            - incoming: id -> list of source node ids
            - outgoing: id -> list of target node ids
            - execution_order: topologically sorted node ids
        """
        node_map = {n["id"]: n for n in nodes}
        incoming = {n["id"]: [] for n in nodes}  # Who sends TO this node
        outgoing = {n["id"]: [] for n in nodes}  # Who this node sends TO

        # Build adjacency lists from edges
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            if source in node_map and target in node_map:
                outgoing[source].append(target)
                incoming[target].append(source)

        # Topological sort using Kahn's algorithm
        in_degree = {n_id: len(incoming[n_id]) for n_id in node_map}
        queue = [n_id for n_id, degree in in_degree.items() if degree == 0]
        execution_order = []

        while queue:
            # Sort queue by speaking order for consistent ordering of parallel nodes
            queue.sort(key=lambda n_id: node_map[n_id].get("data", {}).get("speakingOrder", 99))
            current = queue.pop(0)
            execution_order.append(current)

            for target in outgoing[current]:
                in_degree[target] -= 1
                if in_degree[target] == 0:
                    queue.append(target)

        # If not all nodes are in execution_order, there's a cycle - fall back to speaking order
        if len(execution_order) != len(nodes):
            logger.warning("Cycle detected in edges, falling back to speaking order")
            execution_order = sorted(
                [n["id"] for n in nodes],
                key=lambda n_id: node_map[n_id].get("data", {}).get("speakingOrder", 99)
            )

        return {
            "node_map": node_map,
            "incoming": incoming,
            "outgoing": outgoing,
            "execution_order": execution_order
        }

    def get_upstream_responses(self, node_id: str, incoming: Dict[str, List[str]],
                                responses: Dict[str, Dict], node_map: Dict[str, Dict]) -> str:
        """
        Get responses from upstream nodes (nodes that have edges pointing to this node).

        If no edges point to this node, return all available responses.
        """
        upstream_ids = incoming.get(node_id, [])

        # If no incoming edges, this is a root node - it gets just the original query
        if not upstream_ids:
            return ""

        # Build context from upstream responses only
        context_parts = []
        for upstream_id in upstream_ids:
            if upstream_id in responses:
                resp = responses[upstream_id]
                display_name = node_map[upstream_id].get("data", {}).get("displayName", "Unknown")
                context_parts.append(f"\n{display_name}'s response:\n{resp['content']}\n")

        if context_parts:
            return "\n\nPrevious responses from connected council members:" + "".join(context_parts)
        return ""

    async def execute(self, query: str, config: Dict[str, Any]):
        """Execute the full council process following edge connections."""
        nodes = config.get("nodes", [])
        edges = config.get("edges", [])
        config_name = config.get("name", "Council")

        # Log the start of execution
        self.log_decision("root", "start_execution", {"query": query, "config_name": config_name})

        # Build execution graph from edges
        graph = self.build_execution_graph(nodes, edges)
        node_map = graph["node_map"]
        incoming = graph["incoming"]
        execution_order = graph["execution_order"]

        # Separate chairman from participants
        participants = [n for n in nodes if not n.get("data", {}).get("isChairman", False)]
        chairman_nodes = [n for n in nodes if n.get("data", {}).get("isChairman", False)]
        chairman = chairman_nodes[0] if chairman_nodes else None
        chairman_id = chairman["id"] if chairman else None

        # Filter execution order to exclude chairman (handled separately at the end)
        participant_order = [n_id for n_id in execution_order if n_id != chairman_id]

        # Log the edge configuration being used
        logger.info(f"=== COUNCIL EXECUTION ===")
        logger.info(f"Config: {config_name}")
        logger.info(f"Nodes: {[node_map[n].get('data', {}).get('displayName', n) for n in participant_order]}")
        logger.info(f"Edges: {len(edges)} connections")
        for edge in edges:
            src_name = node_map.get(edge.get('source'), {}).get('data', {}).get('displayName', edge.get('source'))
            tgt_name = node_map.get(edge.get('target'), {}).get('data', {}).get('displayName', edge.get('target'))
            logger.info(f"  {src_name} -> {tgt_name}")
        logger.info(f"Execution order: {[node_map[n].get('data', {}).get('displayName', n) for n in participant_order]}")

        # === STAGE 1: Collect individual responses ===
        await self.send("stage_update", stage=1)
        self.log_decision("stage1", "stage_start", {"stage": "individual_responses", "participants": len(participants)})

        stage1_responses = {}

        # Execute nodes in topological order based on edges
        for node_id in participant_order:
            node = node_map[node_id]
            data = node.get("data", {})
            model = data.get("model", "anthropic/claude-3.5-sonnet")
            role = data.get("role", "responder")
            display_name = data.get("displayName", "Unknown")
            custom_prompt = data.get("systemPrompt", "")
            temperature = data.get("temperature", 0.7)
            pattern_id = data.get("reasoningPattern", "standard")

            # Build system prompt with reasoning pattern
            base_prompt = custom_prompt if custom_prompt else self.get_role_prompt(role)
            system_prompt = patterns.apply_pattern_to_prompt(base_prompt, pattern_id, query)

            # Get pattern suffix for user query
            pattern_suffix = patterns.get_pattern_suffix(pattern_id)

            # Get context from upstream nodes (based on edges)
            upstream_context = self.get_upstream_responses(node_id, incoming, stage1_responses, node_map)

            # Build the enhanced query with upstream context
            enhanced_query = query + pattern_suffix if pattern_suffix else query
            if upstream_context:
                enhanced_query = enhanced_query + upstream_context

            # Set node as active
            await self.send("node_state", nodeId=node_id, state="active")

            # Build messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": enhanced_query}
            ]

            # Query the model
            start_time = time.time()
            try:
                response = await query_model(model, messages)
                duration_ms = int((time.time() - start_time) * 1000)

                if response:
                    content = response.get("content", "")
                    usage = response.get("usage", {})
                    cost = self.calculate_cost(model, usage)
                    tokens = usage.get("total_tokens", 0)

                    self.total_tokens += tokens
                    self.total_cost += cost

                    stage1_responses[node_id] = {
                        "content": content,
                        "model": model,
                        "tokens": tokens,
                        "cost": cost,
                    }

                    # Log the execution
                    self.log_execution(
                        stage="stage1_response",
                        node_id=node_id,
                        node_name=display_name,
                        model=model,
                        role=role,
                        input_content=enhanced_query,
                        output_content=content,
                        tokens=tokens,
                        cost=cost,
                        duration_ms=duration_ms
                    )

                    # Log decision
                    self.log_decision(node_id, "response_generated", {
                        "model": model, "role": role, "pattern": pattern_id, "tokens": tokens, "cost": cost
                    })

                    await self.send("response",
                                  nodeId=node_id,
                                  content=content,
                                  tokens=tokens,
                                  cost=cost)
                    await self.send("node_state", nodeId=node_id, state="complete")
                else:
                    self.log_execution(
                        stage="stage1_error",
                        node_id=node_id,
                        node_name=display_name,
                        model=model,
                        role=role,
                        input_content=query,
                        output_content="Model failed to respond",
                        duration_ms=duration_ms
                    )
                    await self.send("node_state", nodeId=node_id, state="error")
                    await self.send("error", nodeId=node_id, error="Model failed to respond")

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.error(f"Error querying {model}: {e}")
                self.log_execution(
                    stage="stage1_error",
                    node_id=node_id,
                    node_name=display_name,
                    model=model,
                    role=role,
                    input_content=query,
                    output_content=str(e),
                    duration_ms=duration_ms
                )
                await self.send("node_state", nodeId=node_id, state="error")
                await self.send("error", nodeId=node_id, error=str(e))

        # === STAGE 2: Peer evaluation (if more than 1 response) ===
        if len(stage1_responses) > 1:
            await self.send("stage_update", stage=2)
            self.log_decision("stage2", "stage_start", {"stage": "peer_evaluation", "responses": len(stage1_responses)})

            # Create anonymized labels
            response_labels = {}
            labels_text = []
            for i, (node_id, resp) in enumerate(stage1_responses.items()):
                label = chr(65 + i)  # A, B, C, ...
                response_labels[f"Response {label}"] = node_id
                labels_text.append(f"Response {label}:\n{resp['content']}")

            responses_text = "\n\n".join(labels_text)

            ranking_prompt = f"""Evaluate these responses to: "{query}"

{responses_text}

Evaluate each response, then provide your ranking.

End with:
FINAL RANKING:
1. Response X
2. Response Y
..."""

            # Get rankings from each participant (using edge-based order)
            for node_id in participant_order:
                node = node_map[node_id]
                data = node.get("data", {})
                model = data.get("model")
                display_name = data.get("displayName", "Unknown")
                role = data.get("role", "responder")

                await self.send("node_state", nodeId=node_id, state="active")

                messages = [{"role": "user", "content": ranking_prompt}]

                start_time = time.time()
                try:
                    response = await query_model(model, messages)
                    duration_ms = int((time.time() - start_time) * 1000)

                    if response:
                        ranking_text = response.get("content", "")
                        usage = response.get("usage", {})
                        cost = self.calculate_cost(model, usage)
                        tokens = usage.get("total_tokens", 0)

                        self.total_tokens += tokens
                        self.total_cost += cost

                        # Parse ranking
                        rankings = self.parse_ranking(ranking_text)

                        # Log the evaluation
                        self.log_execution(
                            stage="stage2_evaluation",
                            node_id=node_id,
                            node_name=display_name,
                            model=model,
                            role=role,
                            input_content=ranking_prompt[:500],
                            output_content=ranking_text,
                            tokens=tokens,
                            cost=cost,
                            duration_ms=duration_ms
                        )

                        # Log decision with rankings
                        self.log_decision(f"{node_id}_ranking", "ranking_provided", {
                            "rankings": rankings, "response_labels": response_labels
                        })

                        await self.send("ranking",
                                      nodeId=node_id,
                                      rankings=rankings,
                                      reasoning=ranking_text[:500])

                    await self.send("node_state", nodeId=node_id, state="complete")

                except Exception as e:
                    duration_ms = int((time.time() - start_time) * 1000)
                    logger.error(f"Error getting ranking from {model}: {e}")
                    self.log_execution(
                        stage="stage2_error",
                        node_id=node_id,
                        node_name=display_name,
                        model=model,
                        role=role,
                        input_content=ranking_prompt[:500],
                        output_content=str(e),
                        duration_ms=duration_ms
                    )

        # === STAGE 3: Chairman synthesis ===
        if chairman:
            await self.send("stage_update", stage=3)
            self.log_decision("stage3", "stage_start", {"stage": "chairman_synthesis"})

            chairman_id = chairman["id"]
            chairman_data = chairman.get("data", {})
            chairman_model = chairman_data.get("model", CHAIRMAN_MODEL)
            chairman_prompt = chairman_data.get("systemPrompt", "")
            chairman_display_name = chairman_data.get("displayName", "Chairman")

            await self.send("node_state", nodeId=chairman_id, state="active")

            # Build context for chairman from upstream nodes (edges pointing to chairman)
            chairman_upstream = incoming.get(chairman_id, [])

            # If chairman has incoming edges, only use those responses
            # Otherwise, use all responses (for backward compatibility)
            if chairman_upstream:
                responses_to_include = {n_id: stage1_responses[n_id]
                                       for n_id in chairman_upstream
                                       if n_id in stage1_responses}
            else:
                responses_to_include = stage1_responses

            context_parts = [f"Original question: {query}\n\nResponses from council members:\n"]
            for resp_node_id, resp in responses_to_include.items():
                display_name = node_map.get(resp_node_id, {}).get("data", {}).get("displayName", "Unknown")
                context_parts.append(f"\n{display_name} ({resp['model']}):\n{resp['content']}\n")

            system = chairman_prompt if chairman_prompt else self.get_role_prompt("chairman")
            chairman_input = "".join(context_parts) + "\n\nProvide your synthesis:"
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": chairman_input}
            ]

            start_time = time.time()
            try:
                response = await query_model(chairman_model, messages)
                duration_ms = int((time.time() - start_time) * 1000)

                if response:
                    content = response.get("content", "")
                    usage = response.get("usage", {})
                    cost = self.calculate_cost(chairman_model, usage)
                    tokens = usage.get("total_tokens", 0)

                    self.total_tokens += tokens
                    self.total_cost += cost

                    # Log chairman synthesis
                    self.log_execution(
                        stage="stage3_synthesis",
                        node_id=chairman_id,
                        node_name=chairman_display_name,
                        model=chairman_model,
                        role="chairman",
                        input_content=chairman_input[:1000],
                        output_content=content,
                        tokens=tokens,
                        cost=cost,
                        duration_ms=duration_ms
                    )

                    # Log final decision
                    self.log_decision(chairman_id, "final_synthesis", {
                        "model": chairman_model, "tokens": tokens, "cost": cost
                    })

                    await self.send("final_answer",
                                  content=content,
                                  tokens=tokens,
                                  cost=cost)
                    await self.send("node_state", nodeId=chairman_id, state="complete")

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.error(f"Error in chairman synthesis: {e}")
                self.log_execution(
                    stage="stage3_error",
                    node_id=chairman_id,
                    node_name=chairman_display_name,
                    model=chairman_model,
                    role="chairman",
                    input_content=chairman_input[:1000],
                    output_content=str(e),
                    duration_ms=duration_ms
                )
                await self.send("error", nodeId=chairman_id, error=str(e))

        # Log completion
        self.log_decision("complete", "execution_complete", {
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost,
            "responses_count": len(stage1_responses)
        })

        # Save conversation to database
        db.save_conversation({
            'id': self.conversation_id,
            'query': query,
            'config': config,
            'responses': stage1_responses,
            'final_answer': {},  # Will be updated by client
            'total_tokens': self.total_tokens,
            'total_cost': self.total_cost
        })

        # Complete
        await self.send("complete",
                       totalTokens=self.total_tokens,
                       totalCost=self.total_cost)

    def parse_ranking(self, text: str) -> List[str]:
        """Parse ranking from model response."""
        import re
        if "FINAL RANKING:" in text:
            parts = text.split("FINAL RANKING:")
            if len(parts) >= 2:
                ranking_section = parts[1]
                matches = re.findall(r'\d+\.\s*Response [A-Z]', ranking_section)
                if matches:
                    return [re.search(r'Response [A-Z]', m).group() for m in matches]
        return re.findall(r'Response [A-Z]', text)


@app.websocket("/ws/execute")
async def websocket_execute(websocket: WebSocket):
    """WebSocket endpoint for real-time council execution."""
    await websocket.accept()
    logger.info("WebSocket connection established")

    executor = CouncilExecutor(websocket)

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "execute":
                query = message.get("query", "")
                config = message.get("config", {})

                logger.info(f"Executing council for query: {query[:50]}...")

                await executor.execute(query, config)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
