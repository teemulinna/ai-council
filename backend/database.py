"""SQLite database for persistent settings and data storage."""

import os
import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from contextlib import contextmanager

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'council.db')

def ensure_db_dir():
    """Ensure the data directory exists."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

@contextmanager
def get_connection():
    """Get a database connection with context manager."""
    ensure_db_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_database():
    """Initialize the database with required tables."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Settings table for key-value storage
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Custom roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_roles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT DEFAULT '🎭',
                prompt TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Conversation history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                config TEXT,
                responses TEXT,
                final_answer TEXT,
                total_tokens INTEGER DEFAULT 0,
                total_cost REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Execution logs table for detailed interaction tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS execution_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                round_number INTEGER DEFAULT 1,
                stage TEXT NOT NULL,
                node_id TEXT,
                node_name TEXT,
                model TEXT,
                role TEXT,
                input_content TEXT,
                output_content TEXT,
                tokens_used INTEGER DEFAULT 0,
                cost REAL DEFAULT 0.0,
                duration_ms INTEGER DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        ''')

        # Decision tree / flow tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS decision_tree (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                round_number INTEGER DEFAULT 1,
                parent_node_id TEXT,
                node_id TEXT NOT NULL,
                decision_type TEXT,
                decision_data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        ''')

        # Cached models from OpenRouter
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cached_models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT,
                tier TEXT,
                context_length INTEGER,
                pricing TEXT,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Favourite models
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS favourite_models (
                model_id TEXT PRIMARY KEY,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()

# === Settings Operations ===

def get_setting(key: str, default: Any = None) -> Any:
    """Get a setting value."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        if row:
            try:
                return json.loads(row['value'])
            except json.JSONDecodeError:
                return row['value']
        return default

def set_setting(key: str, value: Any):
    """Set a setting value."""
    with get_connection() as conn:
        cursor = conn.cursor()
        json_value = json.dumps(value) if not isinstance(value, str) else value
        cursor.execute('''
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (key, json_value))
        conn.commit()

# === Custom Roles Operations ===

def get_custom_roles() -> List[Dict]:
    """Get all custom roles."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM custom_roles ORDER BY created_at DESC')
        return [dict(row) for row in cursor.fetchall()]

def add_custom_role(role: Dict) -> str:
    """Add a custom role."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO custom_roles (id, name, description, icon, prompt)
            VALUES (?, ?, ?, ?, ?)
        ''', (role['id'], role['name'], role.get('description', ''),
              role.get('icon', '🎭'), role.get('prompt', '')))
        conn.commit()
        return role['id']

def delete_custom_role(role_id: str):
    """Delete a custom role."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM custom_roles WHERE id = ?', (role_id,))
        conn.commit()

# === Conversation Operations ===

def save_conversation(conv: Dict) -> str:
    """Save a conversation."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO conversations (id, query, config, responses, final_answer, total_tokens, total_cost)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            conv['id'],
            conv['query'],
            json.dumps(conv.get('config', {})),
            json.dumps(conv.get('responses', {})),
            json.dumps(conv.get('final_answer', {})),
            conv.get('total_tokens', 0),
            conv.get('total_cost', 0.0)
        ))
        conn.commit()
        return conv['id']

def get_conversations(limit: int = 50) -> List[Dict]:
    """Get recent conversations."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?
        ''', (limit,))
        conversations = []
        for row in cursor.fetchall():
            conv = dict(row)
            conv['config'] = json.loads(conv['config']) if conv['config'] else {}
            conv['responses'] = json.loads(conv['responses']) if conv['responses'] else {}
            conv['final_answer'] = json.loads(conv['final_answer']) if conv['final_answer'] else {}
            conversations.append(conv)
        return conversations

def delete_conversation(conv_id: str):
    """Delete a conversation and its logs."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM execution_logs WHERE conversation_id = ?', (conv_id,))
        cursor.execute('DELETE FROM decision_tree WHERE conversation_id = ?', (conv_id,))
        cursor.execute('DELETE FROM conversations WHERE id = ?', (conv_id,))
        conn.commit()

# === Execution Logging Operations ===

def log_execution(log: Dict):
    """Log an execution step."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO execution_logs
            (conversation_id, round_number, stage, node_id, node_name, model, role,
             input_content, output_content, tokens_used, cost, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            log['conversation_id'],
            log.get('round_number', 1),
            log['stage'],
            log.get('node_id'),
            log.get('node_name'),
            log.get('model'),
            log.get('role'),
            log.get('input_content'),
            log.get('output_content'),
            log.get('tokens_used', 0),
            log.get('cost', 0.0),
            log.get('duration_ms', 0)
        ))
        conn.commit()
        return cursor.lastrowid

def get_execution_logs(conversation_id: str, round_number: Optional[int] = None) -> List[Dict]:
    """Get execution logs for a conversation."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if round_number is not None:
            cursor.execute('''
                SELECT * FROM execution_logs
                WHERE conversation_id = ? AND round_number = ?
                ORDER BY timestamp ASC
            ''', (conversation_id, round_number))
        else:
            cursor.execute('''
                SELECT * FROM execution_logs
                WHERE conversation_id = ?
                ORDER BY round_number ASC, timestamp ASC
            ''', (conversation_id,))
        return [dict(row) for row in cursor.fetchall()]

def get_rounds_for_conversation(conversation_id: str) -> List[int]:
    """Get all round numbers for a conversation."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT round_number FROM execution_logs
            WHERE conversation_id = ?
            ORDER BY round_number ASC
        ''', (conversation_id,))
        return [row['round_number'] for row in cursor.fetchall()]

# === Decision Tree Operations ===

def log_decision(decision: Dict):
    """Log a decision in the tree."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO decision_tree
            (conversation_id, round_number, parent_node_id, node_id, decision_type, decision_data)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            decision['conversation_id'],
            decision.get('round_number', 1),
            decision.get('parent_node_id'),
            decision['node_id'],
            decision.get('decision_type'),
            json.dumps(decision.get('decision_data', {}))
        ))
        conn.commit()
        return cursor.lastrowid

def get_decision_tree(conversation_id: str, round_number: Optional[int] = None) -> List[Dict]:
    """Get decision tree for a conversation."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if round_number is not None:
            cursor.execute('''
                SELECT * FROM decision_tree
                WHERE conversation_id = ? AND round_number = ?
                ORDER BY timestamp ASC
            ''', (conversation_id, round_number))
        else:
            cursor.execute('''
                SELECT * FROM decision_tree
                WHERE conversation_id = ?
                ORDER BY round_number ASC, timestamp ASC
            ''', (conversation_id,))
        trees = []
        for row in cursor.fetchall():
            tree = dict(row)
            tree['decision_data'] = json.loads(tree['decision_data']) if tree['decision_data'] else {}
            trees.append(tree)
        return trees

# === Cached Models Operations ===

def cache_models(models: List[Dict]):
    """Cache models from OpenRouter."""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Clear existing cache
        cursor.execute('DELETE FROM cached_models')
        # Insert new models
        for model in models:
            cursor.execute('''
                INSERT INTO cached_models (id, name, provider, tier, context_length, pricing)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                model['id'],
                model['name'],
                model.get('provider', ''),
                model.get('tier', 'standard'),
                model.get('context_length', 0),
                json.dumps(model.get('pricing', {}))
            ))
        conn.commit()

def get_cached_models() -> List[Dict]:
    """Get cached models."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM cached_models ORDER BY provider, name')
        models = []
        for row in cursor.fetchall():
            model = dict(row)
            model['pricing'] = json.loads(model['pricing']) if model['pricing'] else {}
            models.append(model)
        return models

def get_cache_age() -> Optional[datetime]:
    """Get when models were last cached."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT MAX(cached_at) as cached_at FROM cached_models')
        row = cursor.fetchone()
        if row and row['cached_at']:
            return datetime.fromisoformat(row['cached_at'])
        return None

# === Favourite Models Operations ===

def get_favourite_models() -> List[str]:
    """Get favourite model IDs."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT model_id FROM favourite_models ORDER BY added_at DESC')
        return [row['model_id'] for row in cursor.fetchall()]

def add_favourite_model(model_id: str):
    """Add a favourite model."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO favourite_models (model_id) VALUES (?)
        ''', (model_id,))
        conn.commit()

def remove_favourite_model(model_id: str):
    """Remove a favourite model."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM favourite_models WHERE model_id = ?', (model_id,))
        conn.commit()

# Initialize database on module load
init_database()
