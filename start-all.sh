#!/bin/bash
# Unified starter for a2a-script-agent
# Kills Ollama before starting, then starts all services

set -e
export OLLAMA_MODELS='C:\Users\dev\Desktop\.ollama'

echo "=== Unified Starter for a2a-script-agent ==="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===========================================
# Step 1: Kill existing Ollama processes
# ===========================================
echo -e "${YELLOW}[1/4]${NC} Killing existing Ollama processes..."

if command -v taskkill &> /dev/null; then
    # Windows
    taskkill /F /IM ollama.exe 2>/dev/null || echo "No Ollama process to kill (Windows)"
else
    # Unix-like
    pkill -f ollama 2>/dev/null || echo "No Ollama process to kill (Unix)"
fi

echo -e "${GREEN}Ollama killed${NC}"

# Wait a moment for cleanup
sleep 2

# ===========================================
# Step 2: Start Ollama in background
# ===========================================
echo -e "${YELLOW}[2/4]${NC} Starting Ollama..."

if command -v ollama &> /dev/null; then
    export OLLAMA_HOST=0.0.0.0:11434
    export OLLAMA_MODELS='C:\Users\dev\Desktop\.ollama'
    ollama serve &
    OLLAMA_PID=$!
    echo "Ollama started (PID: $OLLAMA_PID)"
    
    # Wait for Ollama to be ready
    echo "Waiting for Ollama to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}Ollama is ready!${NC}"
            break
        fi
        sleep 1
    done
else
    echo -e "${RED}Ollama not found! Please install Ollama first.${NC}"
    exit 1
fi

# ===========================================
# Step 3: Start ai-integration in background
# ===========================================
echo -e "${YELLOW}[3/4]${NC} Starting ai-integration..."

cd ai-integration
export OLLAMA_MODELS='C:\Users\dev\Desktop\.ollama'
python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port 11434 &
AI_INTEGRATION_PID=$!
cd ..

echo "ai-integration started (PID: $AI_INTEGRATION_PID)"

# Wait for ai-integration to be ready
sleep 3
echo -e "${GREEN}ai-integration is ready!${NC}"

# ===========================================
# Step 4: Start a2a-server in background
# ===========================================
echo -e "${YELLOW}[4/4]${NC} Starting a2a-server..."

cd a2a-server
npm run dev &
A2A_SERVER_PID=$!
cd ..

echo "a2a-server started (PID: $A2A_SERVER_PID)"

# Wait for a2a-server to be ready
sleep 5
echo -e "${GREEN}a2a-server is ready!${NC}"

# ===========================================
# Summary
# ===========================================
echo ""
echo "=== All services started successfully! ==="
echo ""
echo "Services:"
echo "  - Ollama:      http://localhost:11434"
echo "  - ai-integration: http://localhost:11434 (API)"
echo "  - a2a-server:  http://localhost:3000"
echo ""
echo "To stop all services, run: pkill -f 'ollama serve\|uvicorn\|npm run dev'"
echo ""
echo "PIDs: Ollama=$OLLAMA_PID, ai-integration=$AI_INTEGRATION_PID, a2a-server=$A2A_SERVER_PID"
