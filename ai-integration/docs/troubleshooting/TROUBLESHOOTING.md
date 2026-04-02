# AI Integration Troubleshooting Guide

## Common Issues

### 1. Ollama Not Available

**Symptom:** `ollama_available: false` in health response

**Diagnosis:**
```bash
curl http://localhost:11434/health/ollama
curl http://localhost:11435/api/tags
```

**Solutions:**
- Start Ollama: `ollama serve` or `GET /ollama/start`
- Check if port 11435 is in use: `netstat -ano | findstr 11435`
- Check Ollama logs: `ollama logs`

---

### 2. Promise Stays in Pending

**Symptom:** Promise never completes, stays in "pending" status

**Diagnosis:**
```bash
# Check pending promises
curl http://localhost:11434/promises/pending

# Check daemon status
curl http://localhost:11434/daemon/status
```

**Solutions:**
- Ensure daemon is running: `POST /daemon/start`
- Manually execute: `POST /promise/{id}/execute`
- Check error: `GET /promise/{id}` - look for `error` field
- Retry failed promise: `POST /promise/{id}/retry`

---

### 3. Proxy Returns 503

**Symptom:** HTTP 503 Service Unavailable

**Diagnosis:**
```bash
curl http://localhost:11434/health/ready
```

**Solutions:**
- Check Ollama availability: `GET /health/ollama`
- Restart Ollama: `POST /ollama/restart`
- Check proxy logs in `proxy_logs/`

---

### 4. Model Not Found

**Symptom:** Error loading model or model not available

**Diagnosis:**
```bash
curl http://localhost:11435/api/tags
curl http://localhost:11434/v1/models
```

**Solutions:**
- Pull model: `ollama pull qwen3:8b`
- Check model mapping in `AI_HUB_CONFIG`
- Update default model in config

---

### 5. Timeout Errors

**Symptom:** Requests timeout

**Diagnosis:**
```bash
# Check current timeout
grep FORWARD_TIMEOUT ai-integration/.env
```

**Solutions:**
- Increase `FORWARD_TIMEOUT_SECONDS` in config
- Check network connectivity to Ollama
- Reduce model complexity or use smaller model

---

### 5. Provider Timeout for Slow External Providers

**Symptom:** Requests to external providers (OpenRouter, Groq, etc.) timeout before completion

**Diagnosis:**
```bash
# Check current provider timeout
echo $PROVIDER_TIMEOUT
# Or check in .env file
grep PROVIDER_TIMEOUT ai-integration/.env
```

**Solutions:**
- Set `PROVIDER_TIMEOUT=120` for slow external providers (120 seconds)
- Use default `PROVIDER_TIMEOUT=30` for fast local providers (Ollama)
- For quick connection checks only, use `PROVIDER_TIMEOUT=10`

**Recommended Values:**
| Provider Type | PROVIDER_TIMEOUT | Description |
|---------------|------------------|-------------|
| Ollama (local) | 30s | Default, fast local provider |
| OpenRouter | 120s | External API, can be slow |
| Groq | 120s | External API, can be slow |
| HuggingFace | 120s | External API, can be slow |
| Connection check only | 10s | Just verify connection |

**Example:**
```bash
# For slow external providers
PROVIDER_TIMEOUT=120 python -m pytest tests/providers/test_ollama_provider.py -v
```

---

### 6. Cache Issues

**Symptom:** Stale responses or cache errors

**Diagnosis:**
```bash
curl http://localhost:11434/health
# Check cache_status field
```

**Solutions:**
- Clear cache: Delete `storage/cache/` directory
- Disable caching: Set `CACHE_ENABLED=false`
- Check cache TTL settings

---

### 7. Daemon Not Starting

**Symptom:** Daemon fails to start or crashes

**Diagnosis:**
```bash
curl http://localhost:11434/daemon/status
# Check logs in terminal
```

**Solutions:**
- Check `DAEMON_ENABLED=true` in config
- Verify `DAEMON_POLL_INTERVAL` is valid
- Check network access to proxy

---

### 8. Port Conflicts

**Symptom:** "Port already in use" error

**Diagnosis:**
```bash
netstat -ano | findstr "11434"
netstat -ano | findstr "11435"
```

**Solutions:**
- Kill process on port: `taskkill /PID {PID} /F`
- Change port in config: `PROXY_PORT=11436`

---

## Debug Commands

### Full Health Check
```bash
# Run complete health check
curl http://localhost:11434/health
curl http://localhost:11434/health/ollama
curl http://localhost:11434/health/ready
```

### Promise Debugging
```bash
# List all pending
curl http://localhost:11434/promises/pending

# Get specific promise
curl http://localhost:11434/promise/{id}

# Get request body
curl http://localhost:11434/promise/{id}/request

# Get response
curl http://localhost:11434/promise/{id}/response
```

### Storage Debugging
```bash
# Storage stats
curl http://localhost:11434/cleanup/stats

# Run cleanup
curl -X POST http://localhost:11434/cleanup/run
```

### Metrics
```bash
# Prometheus metrics
curl http://localhost:11434/metrics
```

---

## Log Locations

| Component | Location |
|-----------|----------|
| Proxy logs | `ai-integration/proxy_logs/requests/request_*/` |
| Promise storage | `ai-integration/storage/promises/` |
| Cache | `ai-integration/storage/cache/` |
| Ollama logs | `ollama logs` |

---

## Recovery Procedures

### Full System Restart
```bash
# Stop all services
./kill-all.bat

# Start services
cd ai-integration && docker-compose up -d
start-all.bat
```

### Clear All Promises
```bash
# Stop daemon first
curl -X POST http://localhost:11434/daemon/stop

# Delete promise storage
rm -rf ai-integration/storage/promises/

# Restart daemon
curl -X POST http://localhost:11434/daemon/start
```

### Reset Ollama
```bash
# Stop Ollama via proxy
curl -X POST http://localhost:11434/ollama/stop

# Kill any remaining processes
taskkill /F /IM ollama.exe

# Start Ollama
curl http://localhost:11434/ollama/start