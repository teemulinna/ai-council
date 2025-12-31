#!/bin/bash

# Enhanced startup script for AI Council MVP
# Uses unique non-standard ports: Frontend=3847, Backend=8347

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default ports (unique, non-standard)
FRONTEND_PORT=3847
BACKEND_PORT=8347

echo "🚀 AI Council MVP Startup"
echo "========================"
echo ""
echo -e "${BLUE}📍 Ports: Frontend=$FRONTEND_PORT, Backend=$BACKEND_PORT${NC}"
echo ""

# Check if .env file exists (root or backend)
ENV_FILE=""
if [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f "backend/.env" ]; then
    ENV_FILE="backend/.env"
fi

if [ -z "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️ .env file not found${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Created .env from .env.example"
    else
        cat > .env << EOF
# AI Council Configuration
PORT=$BACKEND_PORT
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:$FRONTEND_PORT
OPENROUTER_API_KEY=your_api_key_here
EOF
    fi
    echo -e "${RED}❌ Please edit .env and add your OPENROUTER_API_KEY${NC}"
    echo "   Get your key at: https://openrouter.ai/keys"
    exit 1
fi

# Check for OPENROUTER_API_KEY
source "$ENV_FILE"
if [ -z "$OPENROUTER_API_KEY" ] || [ "$OPENROUTER_API_KEY" = "your_api_key_here" ] || [ "$OPENROUTER_API_KEY" = "sk-or-v1-your-key-here" ]; then
    echo -e "${RED}❌ Error: OPENROUTER_API_KEY not configured${NC}"
    echo "Please edit .env and add your OpenRouter API key"
    echo "Get your key at: https://openrouter.ai/keys"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check Docker option
if [ "$1" = "--docker" ] || [ "$1" = "-d" ]; then
    echo "🐳 Starting with Docker..."
    echo ""

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo "Please start Docker Desktop and try again"
        exit 1
    fi

    # Build and start containers
    echo "Building containers..."
    docker-compose build

    echo "Starting services..."
    docker-compose up -d

    echo ""
    echo -e "${GREEN}✅ AI Council is running with Docker!${NC}"
    echo ""
    echo "📍 Services:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend:  http://localhost:8000"
    echo "   - Redis:    localhost:6379"
    echo ""
    echo "📊 View logs:      docker-compose logs -f"
    echo "🛑 Stop services:  docker-compose down"
    echo ""
    exit 0
fi

# Check for Redis (optional but recommended)
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis is running (caching enabled)${NC}"
        REDIS_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️ Redis not running (starting without caching)${NC}"
        echo "   To enable caching: brew install redis && brew services start redis"
        REDIS_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}⚠️ Redis not installed (caching disabled)${NC}"
    REDIS_AVAILABLE=false
fi

# Check ports
if check_port $BACKEND_PORT; then
    echo -e "${RED}❌ Port $BACKEND_PORT is already in use${NC}"
    echo "   Kill the process: lsof -ti:$BACKEND_PORT | xargs kill -9"
    exit 1
fi

if check_port $FRONTEND_PORT; then
    echo -e "${RED}❌ Port $FRONTEND_PORT is already in use${NC}"
    echo "   Kill the process: lsof -ti:$FRONTEND_PORT | xargs kill -9"
    exit 1
fi

PORT=$BACKEND_PORT

# Install Python dependencies if needed
echo "📦 Checking Python dependencies..."
cd backend
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt -q
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️ No requirements.txt found${NC}"
fi
cd ..

# Install frontend dependencies if needed
echo "📦 Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

# Start backend
echo ""
echo "🚀 Starting backend server on port $PORT..."
cd backend
if [ "$REDIS_AVAILABLE" = true ]; then
    REDIS_URL="redis://localhost:6379" PORT=$PORT python -m uvicorn main:app --host 0.0.0.0 --port $PORT --reload &
else
    PORT=$PORT python -m uvicorn main:app --host 0.0.0.0 --port $PORT --reload &
fi
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..10}; do
    if curl -s http://localhost:$PORT/ > /dev/null; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    sleep 1
done

# Set frontend environment variables
export VITE_API_URL="http://localhost:$BACKEND_PORT"
export VITE_WS_URL="ws://localhost:$BACKEND_PORT/ws/execute"
export VITE_PORT=$FRONTEND_PORT

# Start frontend
echo "🚀 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
echo "Waiting for frontend..."
sleep 3

# Success message
echo ""
echo -e "${GREEN}✨ AI Council MVP is running!${NC}"
echo ""
echo "📍 Access the application at:"
echo "   ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo ""
echo "📊 API Documentation:"
echo "   http://localhost:$BACKEND_PORT/docs"
echo ""
echo "💡 Quick Start:"
echo "   1. Open http://localhost:$FRONTEND_PORT"
echo "   2. Drag models onto canvas or load a preset"
echo "   3. Enter your question and click Run!"
echo ""
echo "🧪 Run tests:      ./run_tests.sh"
echo "🐳 Use Docker:     ./start.sh --docker"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

# Wait for processes
wait