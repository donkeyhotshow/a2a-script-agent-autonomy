#!/bin/bash
# kill-all.sh - Standardized dual-verification process termination
# Following docs/troubleshooting/standardize-stop-scripts.md
#
# Pattern: 1) Kill by port -> 2) Verify port free -> 3) Kill by PID/name -> 4) Verify processes gone -> 5) Clear .pids.txt

set -e

PID_FILE=".pids.txt"
EXIT_CODE=0
FAILED_SVC=""

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

# Service definitions
# Format: name|port|pidkey|process1,process2
SERVICES=(
    "Ollama|11434|OLLAMA_PID|ollama"
    "ai-integration|11435|AI_INTEGRATION_PID|python,uvicorn"
    "a2a-server|3000|A2A_SERVER_PID|node"
    "client-api|3001|CLIENT_API_PID|node"
    "web-ui|5173|WEB_UI_PID|node"
)

# Load PIDs from file
declare -A PIDS
echo ""
log STEP "INIT" "Loading PIDs from $PID_FILE..."
if [[ -f "$PID_FILE" ]]; then
    while IFS='=' read -r key value; do
        if [[ -n "$key" && -n "$value" ]]; then
            PIDS["$key"]="$value"
            log INFO "Loaded: $key = $value"
        fi
    done < "$PID_FILE"
else
    log INFO "$PID_FILE not found, proceeding without PID file"
fi

echo ""
log STEP "Phase 1" "Kill by port (find and terminate port listeners)"

for svc_def in "${SERVICES[@]}"; do
    IFS='|' read -r svc_name svc_port pid_key procs <<< "$svc_def"
    
    echo ""
    log INFO "Processing $svc_name (port $svc_port)..."
    
    # Kill by port - find process listening on port
    PORT_PID=$(lsof -ti :"$svc_port" 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$svc_port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
    
    if [[ -n "$PORT_PID" ]]; then
        log WARN "Port $svc_port occupied by PID $PORT_PID - terminating..."
        kill -9 "$PORT_PID" 2>/dev/null || true
        log OK "Killed PID $PORT_PID"
    else
        log OK "Port $svc_port already free"
    fi
done

echo ""
log STEP "Phase 2" "Verify ports are free"

for svc_def in "${SERVICES[@]}"; do
    IFS='|' read -r svc_name svc_port pid_key procs <<< "$svc_def"
    
    # Check port is free (multiple attempts)
    attempts=0
    port_busy=1
    while [[ $attempts -lt 10 && $port_busy -eq 1 ]]; do
        port_busy=0
        PORT_PID=$(lsof -ti :"$svc_port" 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$svc_port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
        if [[ -n "$PORT_PID" ]]; then
            port_busy=1
            kill -9 "$PORT_PID" 2>/dev/null || true
            attempts=$((attempts + 1))
            sleep 0.5
        fi
    done
    
    if [[ $port_busy -eq 1 ]]; then
        log ERROR "$svc_name port $svc_port still occupied after 10 attempts"
        EXIT_CODE=1
        FAILED_SVC="$FAILED_SVC,$svc_name-port"
    else
        log OK "$svc_name port $svc_port verified free"
    fi
done

echo ""
log STEP "Phase 3" "Kill by PID from file and by process name"

for svc_def in "${SERVICES[@]}"; do
    IFS='|' read -r svc_name svc_port pid_key procs <<< "$svc_def"
    
    # Kill by PID from file
    if [[ -n "${PIDS[$pid_key]}" ]]; then
        pid="${PIDS[$pid_key]}"
        log INFO "Killing $svc_name by PID $pid from file..."
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
            log OK "Killed PID $pid"
        else
            log OK "PID $pid not running"
        fi
    else
        log INFO "No PID file entry for $svc_name"
    fi
    
    # Kill by process name
    IFS=',' read -ra proc_array <<< "$procs"
    for proc in "${proc_array[@]}"; do
        pkill -f "$proc" 2>/dev/null || true
        log OK "Sent kill signal to $proc processes"
    done
done

echo ""
log STEP "Phase 4" "Kill common wrapper processes"

for proc in node npm npx tsx; do
    pkill -f "$proc" 2>/dev/null || true
done
log OK "Sent kill signals to common processes"

echo ""
log STEP "Phase 5" "Verify processes gone and cleanup"

sleep 2

for svc_def in "${SERVICES[@]}"; do
    IFS='|' read -r svc_name svc_port pid_key procs <<< "$svc_def"
    
    PORT_PID=$(lsof -ti :"$svc_port" 2>/dev/null)
    if [[ -n "$PORT_PID" ]]; then
        log ERROR "$svc_name still has process on port $svc_port (PID: $PORT_PID)"
        EXIT_CODE=1
        FAILED_SVC="$FAILED_SVC,$svc_name-port"
    fi
done

# Only delete .pids.txt if all services terminated cleanly
if [[ $EXIT_CODE -eq 0 ]]; then
    if [[ -f "$PID_FILE" ]]; then
        rm -f "$PID_FILE"
        log OK "All services terminated - $PID_FILE deleted"
    else
        log INFO "$PID_FILE not present"
    fi
else
    log WARN "Some services could not be terminated - $PID_FILE preserved"
    log WARN "Failed: $FAILED_SVC"
fi

echo ""
log STEP "Complete" "Termination complete (exit code: $EXIT_CODE)"
exit $EXIT_CODE
