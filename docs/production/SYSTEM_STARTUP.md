# System Startup Guide

## Overview

This document describes how to start and verify all components of the production system.

## Component Ports

| Component | Port | Description |
|-----------|------|-------------|
| a2a-server | 3000 | Main HTTP API server |
| Client API | 3001 | Client proxy that forwards to server |
| Web UI | 5173 | Vite development server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Queue backend |
| Ollama | 11434 | Direct LLM access (if running standalone) |
| AI Integration Proxy | 11435 | Proxy that manages Ollama and provides additional features |

## Health Check Endpoints

### a2a-server (Port 3000)

```bash
# Basic health check
curl -s http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0"}

# Readiness check (includes database, Redis)
curl -s http://localhost:3000/health/ready

# Metrics
curl -s http://localhost:3000/metrics
```

### AI Integration Proxy (Port 11435)

```bash
# Basic health check
curl -s http://localhost:11435/health
# Returns: proxy status, Ollama availability, cache status

# Ollama-specific health check
curl -s http://localhost:11435/health/ollama
# Returns: Ollama running status, PID, idle time

# Readiness check
curl -s http://localhost:11435/health/ready

# Metrics (Prometheus format)
curl -s http://localhost:11435/metrics

# Ollama status
curl -s http://localhost:11435/ollama/status
```

### Ollama (Port 11434)

```bash
# List available models
curl -s http://localhost:11434/api/tags
# Returns: {"models": [...]}

# Check if Ollama is responding
curl -s http://localhost:11434/
```

## Starting the System

### Prerequisites

1. PostgreSQL running on port 5432
2. Redis running on port 6379
3. Ollama installed (optional, can be auto-started by proxy)

### Quick Start

```bash
# Run from project root
start-all.bat
```

Or manually:

```bash
# 1. Start a2a-server
cd a2a-server
npm run dev

# 2. Start AI Integration Proxy (in separate terminal)
cd ai-integration
python -m proxy

# 3. (Optional) Start Ollama manually
ollama serve
```

## Verifying the Stack

### 1. Check Server Health

```bash
curl -s http://localhost:3000/health
```

### 2. Check AI Integration Proxy Health

```bash
curl -s http://localhost:11435/health
```

### 3. Check Ollama Availability

```bash
curl -s http://localhost:11435/health/ollama
```

### 4. Run Production Tests

```bash
# Test all modes
node scripts/prod-test.js

# Test specific mode
node scripts/prod-test.js --mode server

# Test with custom URLs
node scripts/prod-test.js --server-url http://localhost:3000
```

## Promise queue daemon

When the proxy queue shows pending tickets for Ollama (`/promises/pending`), you can let a background daemon handle approvals and capture qwen3:8b output instead of clicking through the web UI.

```bash
python ai-integration/scripts/promise_queue_daemon.py --interval 3 --log-level DEBUG
```

What the daemon does:

- Polls `/promises/pending` and logs every waiting `promiseId`.
- Automatically posts to `/promise/<id>/execute` unless you pass `--no-auto-approve`/`--dry-run`.
- Rechecks `/promise/<id>/response` until status `200` (retry options driven by `--response-attempts`/`--response-delay`).
- Prints the final response preview so you can confirm qwen3:8b produced the expected stream.

Useful flags:

- `--proxy-url` (default `PROMISE_PROXY_URL` / `PROXY_URL` / `http://localhost:11434`)
- `--no-auto-approve` – log tickets without executing them.
- `--dry-run` – skip both execute and response phases.
- `--max-empty-cycles N` – exit after N iterations without pending tickets.

This keeps the queue moving and guarantees the proxy eventually returns qwen output instead of leaving requests stuck in pending state.

## Common Issues

### 404 on /invoke

**Symptom**: `POST /invoke` returns 404

**Solution**: Use `/api/v1/invoke` instead. The correct endpoint is:
- Server: `POST http://localhost:3000/api/v1/invoke`
- Client: `POST http://localhost:3001/api/v1/invoke`

### 404 on /api/generate

**Symptom**: `POST /api/generate` returns 404

**Solution**: Make sure to use the ai-integration proxy port (11435), not direct Ollama (11434). The proxy forwards to Ollama internally.

### Model Not Found

**Symptom**: `model 'qwen3:8b' not found`

**Solution**: 
1. Check available models: `curl -s http://localhost:11434/api/tags`
2. Pull the model: `ollama pull qwen3:8b`

### Connection Refused

**Symptom**: `ECONNREFUSED`

**Solution**: 
1. Check if service is running: `netstat -ano | findstr "3000"`
2. Check firewall settings
3. Verify the service started correctly

## Diagnostic Commands

### Check Port Usage

```bash
# Windows
netstat -ano | findstr "3000 3001 11434 11435"
```

### View Server Logs

```bash
# a2a-server logs
type a2a-server\a2a-server.log

# AI Integration proxy logs
# Check console output
```

### Test Direct Ollama

```bash
# If proxy is not responding, test direct Ollama
curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama2","prompt":"hello","stream":false}'
```

## Environment Variables

### a2a-server (.env)

```
PORT=3000
AI_HUB_URL=http://localhost:11435
OLLAMA_HOST=http://localhost:11434
```

### AI Integration Proxy

```
PROXY_PORT=11435
OLLAMA_HOST=http://localhost:11435
OLLAMA_AUTO_START=true
```
