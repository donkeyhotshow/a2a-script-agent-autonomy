# AI Integration Troubleshooting Guide

**Triangle:** Operators should treat **`GET http://localhost:11434/health`** as the hub gate (**C1**). Repository **`start-all` / `runbook-cli`** do not start a local upstream; configure **`LOCAL_LLM_UPSTREAM_URL`**, providers, or your own process.

## Common Issues

### 1. Local LLM upstream Not Available

**Symptom:** `local_llm_upstream_available: false` in health response

**Diagnosis:**
```bash
curl http://localhost:11434/health
curl http://localhost:11434/health/local-llm-upstream
curl http://localhost:11435/api/tags
```

**Solutions:**
- Start local HTTP LLM (your command / process manager), or `GET /local-llm-upstream/start` on the proxy when configured — not via removed `scripts/start-local-llm.bat`.
- Check if port 11435 is in use: `netstat -ano | findstr 11435`
- Check logs from the process you use to run the local HTTP LLM.

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
- Check local upstream availability: `GET /health/local-llm-upstream`
- Restart via proxy helper: `POST /local-llm-upstream/restart`
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
- Pull model: use your local HTTP LLM vendor CLI so `qwen3:8b` appears in `/api/tags`.
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
- Check network connectivity to Local LLM upstream
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
- Use default `PROVIDER_TIMEOUT=30` for fast local providers (Local LLM upstream)
- For quick connection checks only, use `PROVIDER_TIMEOUT=10`

**Recommended Values:**
| Provider Type | PROVIDER_TIMEOUT | Description |
|---------------|------------------|-------------|
| Local LLM upstream (local) | 30s | Default, fast local provider |
| OpenRouter | 120s | External API, can be slow |
| Groq | 120s | External API, can be slow |
| HuggingFace | 120s | External API, can be slow |
| Connection check only | 10s | Just verify connection |

**Example:**
```bash
# For slow external providers
PROVIDER_TIMEOUT=120 python -m pytest tests/providers/test_router.py -v
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

### 9. Upstream API key: limits, auth, and flaky first response

**Symptom:** `proxy_logs/promises/<id>/body.md` contains JSON such as `{"error":{"code":"1302","message":"Rate limit reached for requests"}}`, or HTTP **401** with `code` **1001** (sometimes rewritten — see below).

**What the provider is doing**

- **Rate limit (e.g. code 1302)** — Expected operational condition: the key or account is throttled. Not a defect in this repo. Back off, reduce concurrency, or adjust quota/plan upstream.
- **Auth / key problems (e.g. code 1001 with 401)** — Upstream authentication failure (wrong or expired key, or account state). The proxy normalizes Z.AI-style **1001** on JSON **401** responses to a stable machine code (`upstream_auth_failed`) so opaque **1001** does not spread through the stack; see `proxy/proxy_handler.py`.
- **Policy depends on key / account type** — The same key can get **different** errors (limit vs auth vs other blocks) depending on **provider-side rules** applied to that key. Do not assume one code always means the same human cause.

**Retries**

- The **first** call may fail while a **later retry** succeeds (burst windows, transient throttle, cold routing). That is **normal** provider behavior: retry with backoff; do not treat it automatically as a bug in the proxy or a2a-server.

**Diagnosis**

```bash
# Per-promise logged request/response bodies (including upstream JSON errors)
dir ai-integration\proxy_logs\promises
```

**Solutions**

- **1302 / rate limit:** Wait, retry, lower parallel load.
- **401 / auth:** Fix provider credentials in `config/providers.json` (`api_keys` / `providers.*.api_key`) — see [`../configuration/PROVIDERS_AND_API_KEYS.md`](../configuration/PROVIDERS_AND_API_KEYS.md). Restart the proxy; confirm account status with the provider.
- **Malformed LLM step JSON** (e.g. multiple keys under `execute`) is a **different** class of problem — A2A contract / model output; use `tests/direct-tests/validators/` and project action-key rules, not this section.

---

## Debug Commands

### Full Health Check
```bash
# Run complete health check
curl http://localhost:11434/health
curl http://localhost:11434/health/local-llm-upstream
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
| Proxy LLM traces | `ai-integration/proxy_logs/promises/<promiseId>/` (`request.json`, `response.json`, `body_raw.json`, …) |
| Legacy request dumps (non-promise paths) | `ai-integration/proxy_logs/requests/request_*/` |
| Promise upstream bodies (debug) | `ai-integration/proxy_logs/promises/<promiseId>/body.md` |
| Promise storage | `ai-integration/storage/promises/` |
| Cache | `ai-integration/storage/cache/` |
| Local LLM upstream logs | stdout/stderr of your `LOCAL_LLM_SERVE_CMD` process |

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

### Reset Local LLM upstream
```bash
# Stop via proxy helper routes
curl -X POST http://localhost:11434/local-llm-upstream/stop

# Kill any remaining local server process (name depends on your install)
taskkill /F /IM local-llm-server.exe

# Start again
curl http://localhost:11434/local-llm-upstream/start