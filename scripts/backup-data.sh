#!/bin/bash
# AI Council - Backup Local Data
# Creates a timestamped backup of your local data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="council_backup_$TIMESTAMP"

echo "💾 AI Council - Backup Data"
echo "================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup subdirectory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup database
if [ -f "$PROJECT_ROOT/backend/data/council.db" ]; then
    cp "$PROJECT_ROOT/backend/data/council.db" "$BACKUP_DIR/$BACKUP_NAME/"
    echo "✓ Database backed up"
fi

# Backup .env (without API keys shown)
if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/$BACKUP_NAME/.env.backup"
    echo "✓ Environment config backed up"
fi

# Create backup info file
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOF
AI Council Backup
Created: $(date)
Host: $(hostname)
User: $(whoami)

Contents:
- council.db: SQLite database with conversations, roles, settings
- .env.backup: Environment configuration (contains API keys!)

To restore:
1. Copy council.db to backend/data/
2. Copy .env.backup to .env
3. Run: ./scripts/setup.sh
EOF

# Create compressed archive
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo ""
echo "✅ Backup complete!"
echo ""
echo "Backup saved to: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo ""
echo "⚠️  Note: Backup contains your API keys. Store securely!"

# Add backups to gitignore
GITIGNORE="$PROJECT_ROOT/.gitignore"
if ! grep -q "backups/" "$GITIGNORE" 2>/dev/null; then
    echo "backups/" >> "$GITIGNORE"
fi
