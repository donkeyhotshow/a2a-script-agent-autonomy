#!/bin/bash
# start-all.sh - Standardized service startup
# Following docs/troubleshooting/standardize-stop-scripts.md
#
# Pattern: 1) Call kill-all.sh -> 2) Verify ports free -> 3) Clear .pids.txt -> 4) Start services

set -e

OLLAMA_PORT=11435
PROXY_PORT=11434
SERVER_PORT=3000
CLIENT_API_PORT=3001
WEB_UI_PORT=5173
OLLAMA_MODELS='/home/dev/.ollama'
PID_FILE='.pids.txt'

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    local level=$1
    shift
    local color="$NC"
    case "$level" in
        STEP) color="$CYAN" ;;
        OK) color="$GREEN" ;;
        WARN) color="$YELLOW" ;;
        ERROR) color="$RED" ;;
    esac
    printf "${color}[%s]${NC} %s\n" "$level" "$*"
}

# Check if port is free
check_port_free() {
    local port=$1
    local attempts=${2:-10}
    local i=0
    
    while [[ $i -lt $attempts ]]; do
        local pid
        pid=$(lsof -ti :"$port" 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
        if [[ -z "$pid" ]]; then
            return 0
        fi
        kill -9 "$pid" 2>/dev/null || true
        i=$((i + 1))
        sleep 0.5
    done
    return 1
}

# Wait for service health
wait_for_health() {
    local url=$1
    local timeout=${2:-30}
    local i=0
    
    while [[ $i -lt $timeout ]]; do
        if curl -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        i=$((i + 1))
        sleep 1
    done
    return 1
}

# Get PID listening on port
get_pid_on_port() {
    local port=$1
    lsof -ti :"$port" 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1
}

echo ""
log STEP "STARTUP" "Standardized service startup"

# ==========================================
# Step 1: Kill existing processes
# ==========================================
echo ""
log STEP "Step 1/8" "Cleaning environment with kill-all.sh..."

if [[ -f "kill-all.sh" ]]; then
    chmod +x kill-all.sh
    ./kill-all.sh || log WARN "kill-all.sh reported issues, continuing with caution..."
else
    log WARN "kill-all.sh not found, proceeding without cleanup"
fi

sleep 2

# ==========================================
# Step 2: Verify all ports are free
# ==========================================
echo ""
log STEP "Step 2/8" "Verifying all ports are free..."

PORTS_OK=1
for port in $OLLAMA_PORT $PROXY_PORT $SERVER_PORT $CLIENT_API_PORT $WEB_UI_PORT; do
    if check_port_free "$port" 10; then
        log OK "Port $port verified free"
    else
        log ERROR "Port $port still occupied"
        PORTS_OK=0
    fi
done

if [[ $PORTS_OK -eq 0 ]]; then
    log ERROR "FATAL: Not all ports could be freed. Aborting startup."
    exit 1
fi

# ==========================================
# Step 3: Clear PID file
# ==========================================
echo ""
log STEP "Step 3/8" "Clearing PID file..."

rm -f "$PID_FILE"
touch "$PID_FILE"
log OK "$PID_FILE reset"

# ==========================================
# Step 4: Start Ollama
# ==========================================
echo ""
log STEP "Step 4/8" "Starting Ollama on port $OLLAMA_PORT..."

if ! command -v ollama &> /dev/null; then
    log ERROR "Ollama not found. Please install Ollama first."
    exit 1
fi

export OLLAMA_HOST="0.0.0.0:$OLLAMA_PORT"
export OLLAMA_MODELS="$OLLAMA_MODELS"
export OLLAMA_ORIGINS="*"

ollama serve &
OLLAMA_PID=$!
sleep 3

# Verify Ollama started
OLLAMA_CHECK_PID=$(get_pid_on_port $OLLAMA_PORT)
if [[ -n "$OLLAMA_CHECK_PID" ]]; then
    echo "OLLAMA_PID=$OLLAMA_CHECK_PID" >> "$PID_FILE"
    log OK "Ollama started (PID: $OLLAMA_CHECK_PID)"
else
    log WARN "Could not verify Ollama PID"
fi

# Wait for Ollama to be ready
if wait_for_health "http://localhost:$OLLAMA_PORT/api/tags" 30; then
    log OK "Ollama is ready"
else
    log WARN "Ollama may not be ready yet"
fi

# ==========================================
# Step 5: Start ai-integration
# ==========================================
echo ""
log STEP "Step 5/8" "Starting ai-integration on port $PROXY_PORT..."

cd ai-integration
export OLLAMA_HOST="http://localhost:$OLLAMA_PORT"
python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port $PROXY_PORT &
AI_PID=$!
cd ..
sleep 3

# Verify ai-integration started
AI_CHECK_PID=$(get_pid_on_port $PROXY_PORT)
if [[ -n "$AI_CHECK_PID" ]]; then
    echo "AI_INTEGRATION_PID=$AI_CHECK_PID" >> "$PID_FILE"
    log OK "ai-integration started (PID: $AI_CHECK_PID)"
else
    log WARN "Could not verify ai-integration PID"
fi

# ==========================================
# Step 6: Start a2a-server
# ==========================================
echo ""
log STEP "Step 6/8" "Starting a2a-server on port $SERVER_PORT..."

cd a2a-server
npm run dev &
SERVER_PID=$!
cd ..
sleep 5

# Verify a2a-server started
SERVER_CHECK_PID=$(get_pid_on_port $SERVER_PORT)
if [[ -n "$SERVER_CHECK_PID" ]]; then
    echo "A2A_SERVER_PID=$SERVER_CHECK_PID" >> "$PID_FILE"
    log OK "a2a-server started (PID: $SERVER_CHECK_PID)"
else
    log WARN "Could not verify a2a-server PID"
fi

# Wait for health check
if wait_for_health "http://localhost:$SERVER_PORT/health" 30; then
    log OK "a2a-server health check passed"
fi

# ==========================================
# Step 7: Start client-api
# ==========================================
echo ""
log STEP "Step 7/8" "Starting client-api on port $CLIENT_API_PORT..."

cd a2a-client/packages/sdk
npm run dev &
CLIENT_PID=$!
cd ../../..
sleep 5

# Verify client-api started
CLIENT_CHECK_PID=$(get_pid_on_port $CLIENT_API_PORT)
if [[ -n "$CLIENT_CHECK_PID" ]]; then
    echo "CLIENT_API_PID=$CLIENT_CHECK_PID" >> "$PID_FILE"
    log OK "client-api started (PID: $CLIENT_CHECK_PID)"
else
    log WARN "Could not verify client-api PID"
fi

# ==========================================
# Step 8: Start web-ui
# ==========================================
echo ""
log STEP "Step 8/8" "Starting web-ui on port $WEB_UI_PORT..."

cd a2a-client
npm run dev &
WEB_PID=$!
cd ..
sleep 5

# Verify web-ui started
WEB_CHECK_PID=$(get_pid_on_port $WEB_UI_PORT)
if [[ -n "$WEB_CHECK_PID" ]]; then
    echo "WEB_UI_PID=$WEB_CHECK_PID" >> "$PID_FILE"
    log OK "web-ui started (PID: $WEB_CHECK_PID)"
else
    log WARN "Could not verify web-ui PID"
fi

# ==========================================
# Summary
# ==========================================
echo ""
log STEP "SUMMARY" "All services started successfully"

echo ""
echo "Services:"
echo "  - Ollama:       http://localhost:$OLLAMA_PORT"
echo "  - ai-integration: http://localhost:$PROXY_PORT (API proxy)"
echo "  - a2a-server:   http://localhost:$SERVER_PORT"
echo "  - client-api:   http://localhost:$CLIENT_API_PORT"
echo "  - web-ui:       http://localhost:$WEB_UI_PORT"

echo ""
echo "Saved PIDs in $PID_FILE:"
cat "$PID_FILE"

echo ""
log INFO "To stop all services, run: ./kill-all.sh"
