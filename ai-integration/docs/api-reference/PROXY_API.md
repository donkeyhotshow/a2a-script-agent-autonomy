# AI Integration API Reference

## Overview

This document provides comprehensive API reference for the AI Integration proxy module. The proxy acts as an intermediary between clients and LLM providers (Ollama, OpenAI, HuggingFace).

**Auth forwarding policy (mandatory):**

- Clients **MUST NOT** forward their own `Authorization` / `API-Key` / similar provider credentials through this proxy.
- The proxy is the **only** place that injects upstream auth headers (for example, `Authorization: Bearer <key>` when calling Z.AI, using the **`api_keys`** pool in **`config/providers.json`** — see [`docs/configuration/PROVIDERS_AND_API_KEYS.md`](../configuration/PROVIDERS_AND_API_KEYS.md)).
- Any incoming auth headers from the client are ignored for upstream provider calls; do not rely on “header passthrough” from the app or a2a-server to Z.AI/Ollama.

## Base URL

```
http://localhost:11434
```

## Endpoints

### Health Checks

#### GET /health
Liveness probe - basic health check.

**Response:**
```json
{
  "status": "running",
  "proxy_port": 11434,
  "ollama_host": "http://localhost:11435",
  "ollama_available": true
}
```

#### GET /health/ollama
Deep health check - Ollama availability.

**Response:**
```json
{
  "status": "healthy",
  "ollama_available": true,
  "ollama_url": "http://localhost:11435",
  "ollama_pid": 12345,
  "idle_seconds": 120
}
```

#### GET /health/ready
Readiness probe - checks if proxy can handle requests.

**Response:**
```json
{
  "status": "ready",
  "ollama_available": true,
  "cache_status": "active"
}
```

---

### Ollama-compatible discovery

#### GET /api/tags

Combined model list for UIs and the a2a-server stack.

**Behavior:** Merges (in order) models from enabled **non-Ollama** providers in `config/providers.json` (e.g. Z.AI), then live models from `OLLAMA_HOST/api/tags` when reachable, then `virtual_models` from the AI Hub JSON config.

**Response shape:** Ollama-style `{ "models": [ ... ] }`. Each element includes a string **`provider`** identifying the backend (`z_ai`, `ollama`, `virtual`, …). Non-Ollama rows may include **`api_key_id`** (first key id for that provider in `config/providers.json` → `api_keys`). Clients should send `model` on `POST /api/chat` / `POST /api/generate` with one of the listed names; the proxy routes to the correct provider.

---

### Ollama Management

#### GET /ollama/status
Get Ollama status.

**Response:**
```json
{
  "running": true,
  "pid": 12345,
  "models_loaded": ["qwen3:8b"]
}
```

#### GET /ollama/start
Start Ollama instance.

#### POST /ollama/stop
Stop Ollama instance.

#### POST /ollama/restart
Restart Ollama instance.

---

### LLM paths (`POST /api/chat`, `POST /api/generate`, `POST /api/embeddings`)

- **Always promise pipeline:** For `POST`/`PUT`/`PATCH` on these paths, the proxy does **not** return a synchronous upstream body. It creates a hub `promiseId`, runs the upstream call in the promise executor, and stores traces only under **`proxy_logs/promises/<promiseId>/`** (not `proxy_logs/requests/`).
- **Explicit `?promise=1` / `X-Promise` / `body.promise`:** Same behavior; required for clients that rely on the flag.
- **Disk cache hit:** The hub may respond with **HTTP 200** and JSON:
  `{ "promiseId", "status": "completed", "cached": true, "responseBody": "<full upstream JSON string>" }`.
  The promise is marked done on disk; clients can use the inline `responseBody` and skip polling.
- **Miss / async:** **HTTP 202** with `{ "promiseId", "status": "pending" }`, then poll `GET /promise/{id}` / `GET /promise/{id}/response` as before.

### Promise Management

#### GET /promises/pending
Get list of pending promises (sorted by created_at, oldest first).

**Response:**
```json
{
  "promises": [
    {
      "promise_id": "prom_abc123",
      "method": "POST",
      "path": "/api/chat",
      "target_url": "http://localhost:11435/api/chat",
      "status": "pending",
      "created_at": "2026-03-20T10:00:00Z",
      "updated_at": "2026-03-20T10:00:00Z"
    }
  ]
}
```

#### GET /promises/ready
Get list of completed promises (sorted by updated_at, oldest first).

#### GET /promises/status
Unified status endpoint - returns ready promises only.

#### GET /promise/{promise_id}
Get promise status by ID.

**Response:**
```json
{
  "promise_id": "prom_abc123",
  "method": "POST",
  "path": "/api/chat",
  "status": "pending|processing|done|error",
  "created_at": "2026-03-20T10:00:00Z",
  "updated_at": "2026-03-20T10:00:00Z",
  "error": null
}
```

#### GET /promise/{promise_id}/request
Get original request body (method, path, headers, body).

#### GET /promise/{promise_id}/response
Get final response (stored assistant-oriented body — see `body.md` pipeline).

#### GET /promise/{promise_id}/body_raw
When the hub persisted `body_raw.json` on success, returns that **full provider JSON** (OpenAI/Ollama-style envelope). Used by `a2a-server` `fetchAiHubChatJson` / `pollReadyThenFetch` with `responseMode: raw_json`. **404** if no raw file (older promises or non-JSON upstream).

#### POST /promise/{promise_id}/execute
Execute promise against Ollama (non-blocking, returns 202).

#### POST /promise/{promise_id}/answer
Manually set answer for promise.

**Request Body:**
```json
{
  "status_code": 200,
  "headers": {"Content-Type": "application/json"},
  "body": "..."
}
```

#### POST /promise/{promise_id}/retry
Reset error promise to pending for daemon retry.

---

### Daemon Management

#### GET /daemon/status
Get daemon status.

**Response:**
```json
{
  "running": true,
  "last_poll": "2026-03-20T10:00:00Z",
  "promises_processed": 42
}
```

#### POST /daemon/start
Start the promise daemon.

#### POST /daemon/stop
Stop the promise daemon.

---

### Cleanup

#### GET /cleanup/stats
Get storage statistics.

**Response:**
```json
{
  "promises": 150,
  "logs": 2300,
  "results": 1450
}
```

#### POST /cleanup/run
Run manual cleanup.

---

### Metrics

#### GET /metrics
Prometheus-compatible metrics.

**Metrics:**
| Name | Type | Description |
|------|------|-------------|
| `ai_proxy_requests_total` | Counter | Total requests |
| `ai_proxy_request_duration_seconds` | Histogram | Request duration |
| `ai_proxy_errors_total` | Counter | Total errors |
| `ollama_model_loaded` | Gauge | Model loaded status |
| `ai_proxy_uptime_seconds` | Gauge | Uptime in seconds |

---

### OpenAI-Compatible API

Implemented in [`proxy/openai_wrapper.py`](../../proxy/openai_wrapper.py) as a Flask blueprint with **`url_prefix='/v1'`** — all routes below are **`/v1/...`** on the proxy base URL (default `http://localhost:11434`). Wrong prefix → **404**.

#### POST /v1/chat/completions
Chat completions endpoint.

**Request:**
```json
{
  "model": "qwen3:8b",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}
```

#### POST /v1/completions
Text completions endpoint.

#### POST /v1/embeddings
Embeddings endpoint.

#### GET /v1/models
List available models.

#### GET /v1/providers
List all providers and their status.

#### POST /v1/providers/{name}/enable
Enable a provider.

#### POST /v1/providers/{name}/disable
Disable a provider.

---

### Native API

#### POST /api/v1/generate
Ollama generate endpoint.

#### POST /api/v1/embed
Ollama embed endpoint.

---

### Web UI

#### GET /queue
Queue manager web interface.

#### GET /web/{path}
Serve static files from web/ folder.

---

## Error Responses

All endpoints may return error responses:

| Status | Description |
|--------|-------------|
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

**Error Response:**
```json
{
  "error": "error_type",
  "message": "Human readable message",
  "details": {}
}
```

### Upstream provider JSON errors (Z.AI and others)

Forwarded chat/generate bodies may contain the provider’s own JSON error object (logged under `proxy_logs/promises/<id>/body.md`). Meaning depends on **HTTP status** and **provider policy** for the API key (rate limit vs auth vs other blocks); the first request can fail and a retry can succeed (transient throttle).

| Upstream `error.code` (typical) | Meaning | Operator action |
|---------------------------------|---------|-----------------|
| `1302` | Rate limit | Expected; backoff, fewer parallel calls; proxy may try the next **api key** for the same provider (see [`PROVIDERS_AND_API_KEYS.md`](../configuration/PROVIDERS_AND_API_KEYS.md)) |
| `1001` (with HTTP **401**) | Auth failure (Z.AI) | Fix key in `config/providers.json` (`api_keys` / provider); proxy may rewrite to `upstream_auth_failed` |

Details and retries: [`docs/troubleshooting/TROUBLESHOOTING.md`](../troubleshooting/TROUBLESHOOTING.md) (section *Upstream API key: limits, auth, and flaky first response*).
