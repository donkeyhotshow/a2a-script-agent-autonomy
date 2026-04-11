# AI Integration Workflows

## Overview

This document describes common workflows and use cases for the AI Integration module.

---

## 1. Promise-Based Async Flow

### Description
Long-running LLM requests are handled asynchronously via promises. Client submits request, receives `promiseId`, polls for completion.

### Steps

```
1. Client sends request with ?promise=1
   POST /api/chat?promise=1
   
2. Proxy creates promise, returns promiseId
   {"promise_id": "prom_abc123"}
   
3. Client polls for status
   GET /promise/prom_abc123
   
4. Daemon executes promise (or manual execution)
   POST /promise/prom_abc123/execute
   
5. Client retrieves result
   GET /promise/prom_abc123/response
```

### Manual Execution
```bash
# Check pending
curl http://localhost:11434/promises/pending

# Execute manually
curl -X POST http://localhost:11434/promise/{id}/execute

# Get result
curl http://localhost:11434/promise/{id}/response
```

`GET http://localhost:11434/health` includes **`promise_daemon_only`** (boolean) so operators and the repo **Task Monitor** can detect this mode without reading env files.

---

## 2. Daemon Auto-Processing Flow

### Description
Built-in daemon automatically polls and processes pending promises.

### Configuration
```bash
DAEMON_ENABLED=true
DAEMON_POLL_INTERVAL=4.0
DAEMON_AUTO_EXECUTE=true
```

### Manual Control
```bash
# Start daemon
curl -X POST http://localhost:11434/daemon/start

# Stop daemon
curl -X POST http://localhost:11434/daemon/stop

# Check status
curl http://localhost:11434/daemon/status
```

---

## 3. Model Resolution Flow

### Description
Requests can use model aliases that are resolved to actual models.

### Configuration (AI_HUB_CONFIG)
```json
{
  "models": {
    "rnj-1": "qwen3:8b",
    "rnj-L": "qwen3:8b"
  },
  "resolve_aliases": true
}
```

### Request Flow
```
Client: POST /api/chat {"model": "rnj-1"}
   → Resolver: "rnj-1" → "qwen3:8b"
   → Proxy forwards to Local LLM upstream with resolved model
```

---

## 4. Caching Flow

### Description
Responses are cached to improve performance on repeated requests.

### Cache Key Generation
```python
# Cache key built from: url + method + args + body
cache_key = hash(url + method + json.dumps(args) + body)
```

### Cache Operations
```bash
# Cache status in health check
curl http://localhost:11434/health
# "cache_status": "active"

# Clear cache manually
rm -rf a2a-ai-hub/storage/cache/
```

---

## 5. Cleanup Flow

### Description
Automatic cleanup of old promises, logs, and results.

### Configuration
```bash
ENABLE_CLEANUP=true
PROMISE_RETENTION_DAYS=7
LOG_RETENTION_DAYS=30
```

### Manual Cleanup
```bash
# Get storage stats
curl http://localhost:11434/cleanup/stats

# Run manual cleanup
curl -X POST http://localhost:11434/cleanup/run
```

---

## 6. Fallback Provider Flow

### Description
If primary provider fails, system can fall back to backup.

### Configuration (providers.json)
```json
{
  "providers": {
    "compat_llm": {
      "enabled": true,
      "priority": 1
    },
    "openai": {
      "enabled": true,
      "priority": 2,
      "api_key": "..."
    }
  }
}
```

### Health Check for Providers
```bash
# Get all provider statuses
curl http://localhost:11434/v1/providers

# Enable/disable provider
curl -X POST http://localhost:11434/v1/providers/compat_llm/enable
curl -X POST http://localhost:11434/v1/providers/openai/disable
```

---

## 7. Simulation Mode Flow

### Description
Proxy can simulate LLM responses based on learned patterns (when SIMULATION_ENABLED=true).

### Configuration
```bash
SIMULATION_ENABLED=true
SIMULATION_DATA_PATH=simulation_data
AI_HUB_CONFIG=docs/ai-hub.config.example.json
```

### Request Flow
```
Client: POST /api/chat {"prompt": "..."}
   → AI Hub Config checks simulation rules
   → If confidence >= 0.75 → simulate response
   → Else → forward to real Local LLM upstream
```

### Testing
```bash
# Get simulation status
curl http://localhost:11434/simulation/status

# Force real Local LLM upstream
curl -X POST http://localhost:11434/simulation/force-real
```

---

## 8. OpenAI-Compatible API Flow

### Description
Proxy exposes OpenAI-compatible endpoints for compatibility with existing clients.

### Endpoints
```
POST /v1/chat/completions
POST /v1/completions
POST /v1/embeddings
GET  /v1/models
```

### Example Request
```bash
curl -X POST http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3:8b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 9. Local LLM upstream Management Flow

### Description
Proxy can auto-start/stop Local LLM upstream based on usage.

### Configuration
```bash
LOCAL_LLM_AUTO_START=true
LOCAL_LLM_IDLE_TIMEOUT=300
```

### Manual Control
```bash
# Get status
curl http://localhost:11434/compat_llm/status

# Start
curl http://localhost:11434/compat_llm/start

# Stop
curl -X POST http://localhost:11434/compat_llm/stop

# Restart
curl -X POST http://localhost:11434/compat_llm/restart
```

---

## 10. Docker Deployment Flow

### Description
Run AI Integration in Docker containers.

### Quick Start
```bash
cd a2a-ai-hub
docker-compose up -d

# Check status
curl http://localhost:11434/health
```

### Available Services
- `compat_llm` - LLM server (port 11435)
- `a2a-ai-hub` - Proxy (port 11434)
- `a2a-ai-hub-dev` - Dev mode (port 11438)

### Scripts
```bash
./docker-run.sh start    # Start services
./docker-run.sh stop     # Stop services
./docker-run.sh restart  # Restart
./docker-run.sh logs     # View logs
./docker-run.sh status   # Check status
./docker-run.sh dev      # Dev mode