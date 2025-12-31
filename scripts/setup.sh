#!/bin/bash
# AI Council - Local Setup Script
# This script initializes local data directories and databases
# Data is stored locally and NOT uploaded to git

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🏛️  AI Council - Local Setup"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Create data directories
echo -e "\n${YELLOW}📁 Creating data directories...${NC}"
mkdir -p "$PROJECT_ROOT/backend/data"
mkdir -p "$PROJECT_ROOT/logs"

# 2. Create .env from example if not exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}📝 Creating .env from template...${NC}"
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✓ Created .env - Please edit with your API keys${NC}"
    else
        cat > "$PROJECT_ROOT/.env" << 'EOF'
# AI Council Configuration
# Copy this file and rename to .env, then fill in your values

# OpenRouter API Key (required)
# Get yours at: https://openrouter.ai/keys
OPENROUTER_API_KEY=your-openrouter-api-key-here

# Backend Configuration
PORT=8347
HOST=0.0.0.0

# Frontend URL for CORS
CORS_ORIGINS=http://localhost:3847

# Budget limits (optional)
MAX_BUDGET=10.0

# Environment
ENVIRONMENT=development
EOF
        echo -e "${GREEN}✓ Created .env template - Please add your API keys${NC}"
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# 3. Initialize SQLite database
echo -e "\n${YELLOW}🗄️  Initializing database...${NC}"
cd "$PROJECT_ROOT/backend"

# Create Python script to init DB
python3 << 'PYEOF'
import sys
sys.path.insert(0, '.')
try:
    from database import init_database, DB_PATH
    init_database()
    print(f"✓ Database initialized at: {DB_PATH}")
except Exception as e:
    print(f"⚠️  Database init skipped: {e}")
PYEOF

# 4. Install backend dependencies if needed
echo -e "\n${YELLOW}📦 Checking backend dependencies...${NC}"
if [ -f "$PROJECT_ROOT/backend/requirements.txt" ]; then
    if command -v pip3 &> /dev/null; then
        pip3 install -r "$PROJECT_ROOT/backend/requirements.txt" --quiet 2>/dev/null || true
        echo -e "${GREEN}✓ Backend dependencies checked${NC}"
    fi
fi

# 5. Install frontend dependencies if needed
echo -e "\n${YELLOW}📦 Checking frontend dependencies...${NC}"
if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
    cd "$PROJECT_ROOT/frontend"
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install --silent 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Frontend dependencies checked${NC}"
fi

# 6. Verify .gitignore entries
echo -e "\n${YELLOW}🔒 Verifying .gitignore...${NC}"
GITIGNORE="$PROJECT_ROOT/.gitignore"
ENTRIES_NEEDED=(
    "# Local data - never commit"
    "backend/data/"
    "*.db"
    "*.db-journal"
    "*.db-wal"
    ".env"
    "logs/"
)

for entry in "${ENTRIES_NEEDED[@]}"; do
    if ! grep -qF "$entry" "$GITIGNORE" 2>/dev/null; then
        echo "$entry" >> "$GITIGNORE"
    fi
done
echo -e "${GREEN}✓ .gitignore verified${NC}"

# 7. Set proper permissions
echo -e "\n${YELLOW}🔐 Setting permissions...${NC}"
chmod 600 "$PROJECT_ROOT/.env" 2>/dev/null || true
chmod 700 "$PROJECT_ROOT/backend/data" 2>/dev/null || true
echo -e "${GREEN}✓ Permissions set${NC}"

# Done
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your OpenRouter API key"
echo "  2. Run: cd backend && python main.py"
echo "  3. Run: cd frontend && npm run dev"
echo ""
echo "Your data is stored locally in:"
echo "  - Database: backend/data/council.db"
echo "  - Logs: logs/"
echo ""
echo "These files are gitignored and won't be uploaded."
