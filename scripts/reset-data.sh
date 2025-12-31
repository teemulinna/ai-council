#!/bin/bash
# AI Council - Reset Local Data
# This script clears all local data (conversations, logs, etc.)
# Use with caution!

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🗑️  AI Council - Reset Local Data"
echo "================================"
echo ""
echo "⚠️  WARNING: This will delete ALL local data including:"
echo "  - Conversation history"
echo "  - Execution logs"
echo "  - Custom roles"
echo "  - Cached models"
echo ""
read -p "Are you sure? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Remove database
if [ -f "$PROJECT_ROOT/backend/data/council.db" ]; then
    rm "$PROJECT_ROOT/backend/data/council.db"
    echo "✓ Removed database"
fi

# Remove database journals
rm -f "$PROJECT_ROOT/backend/data/"*.db-journal 2>/dev/null || true
rm -f "$PROJECT_ROOT/backend/data/"*.db-wal 2>/dev/null || true

# Clear logs
if [ -d "$PROJECT_ROOT/logs" ]; then
    rm -f "$PROJECT_ROOT/logs/"*.log 2>/dev/null || true
    echo "✓ Cleared logs"
fi

# Reinitialize database
echo "Reinitializing database..."
cd "$PROJECT_ROOT/backend"
python3 << 'PYEOF'
import sys
sys.path.insert(0, '.')
try:
    from database import init_database
    init_database()
    print("✓ Database reinitialized")
except Exception as e:
    print(f"⚠️  Could not reinitialize: {e}")
PYEOF

echo ""
echo "✅ Data reset complete!"
echo ""
echo "Note: Browser localStorage (frontend history) is separate."
echo "To clear that, open browser DevTools > Application > Local Storage > Clear"
