# AI Integration API Reference

## Overview

This document provides comprehensive API reference for the AI Integration proxy module. The proxy acts as an intermediary between clients and LLM providers (Local LLM upstream, OpenAI, HuggingFace).

**Auth forwarding policy (mandatory):**

- Clients **MUST NOT** forward their own `Authorization` / `API-Key` / similar provider credentials through this proxy.
- The proxy is the **only** place that injects upstream auth headers (for example, `Authorization: Bearer <key>` when calling Z.AI, using the **`api_keys`** pool in **`config/providers.json`** — see [`docs/configuration/PROVIDERS_AND_API_KEYS.md`](../configuration/PROVIDERS_AND_API_KEYS.md)).
- Any incoming auth headers from the client are ignored for upstream provider calls; do not rely on “header passthrough” from the app or a2a-server to Z.AI/Local LLM upstream.

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
  "local_llm_upstream_host": "http://localhost:11435",
  "local_llm_upstream_available": true
}
```

#### GET /health/compat_llm
Deep health check - Local LLM upstream availability.

**Response:**
```json
{
  "status": "healthy",
  "local_llm_upstream_available": true,
  "local_llm_upstream_url": "http://localhost:11435",
  "local_llm_upstream_pid": 12345,
  "idle_seconds": 120
}
```

#### GET /health/ready
Readiness probe - checks if proxy can handle requests.

**Response:**
```json
{
  "status": "ready",
  "local_llm_upstream_available": true,
  "cache_status": "active"
}
```

---

### Local LLM upstream-compatible discovery

#### GET /api/tags

Combined model list for UIs and the a2a-server stack.

**Behavior:** Merges (in order) models from enabled **non-Local LLM upstream** providers in `config/providers.json` (e.g. Z.AI), then live models from `LOCAL_LLM_UPSTREAM_URL/api/tags` when reachable, then `virtual_models` from the AI Hub JSON config.

**Response shape:** Local LLM upstream-style `{ "models": [ ... ] }`. Each element includes a string **`provider`** identifying the backend (`z_ai`, `compat_llm`, `virtual`, …). Non-Local LLM upstream rows may include **`api_key_id`** (first key id for that provider in `config/providers.json` → `api_keys`). Clients should send `model` on `POST /api/chat` / `POST /api/generate` with one of the listed names; the proxy routes to the correct provider.

---

### Local LLM upstream Management

#### GET /compat_llm/status
Get Local LLM upstream status.

**Response:**
```json
{
  "running": true,
  "pid": 12345,
  "models_loaded": ["qwen3:8b"]
}
```

#### GET /compat_llm/start
Start Local LLM upstream instance.

#### POST /compat_llm/stop
Stop Local LLM upstream instance.

#### POST /compat_llm/restart
Restart Local LLM upstream instance.

---

### LLM paths (`POST /api/chat`, `POST /api/generate`, `POST /api/embeddings`)

- **Always promise pipeline:** For `POST`/`PUT`/`PATCH` on these paths, the proxy does **not** return a synchronous upstream body. It creates a hub `promiseId`, runs the upstream call in the promise executor, and stores traces only under **`proxy_logs/promises/<promiseId>/`** (not `proxy_logs/requests/`).
- **Explicit `?promise=1` / `X-Promise` / `body.promise`:** Same behavior; required for clients that rely on the flag.
- **Disk cache hit:** The hub may respond with **HTTP 200** and JSON:
  `{ "promiseId", "status": "completed", "cached": true, "responseBody": "<full upstream JSON string>" }`.
  The promise is marked done on disk; clients can use the inline `responseBody` and skip polling.
- **Miss / async:** **HTTP 202** with `{ "promiseId", "status": "pending" }`, then poll `GET /promise/{id}` / `GET /promise/{id}/response` as before.

### Promise queue (hub tickets)

LLM `POST` traffic creates a **hub `promiseId`** on disk under `proxy_logs/promises/<id>/`. The **builtin daemon** and **`scripts/promise_queue_daemon.py`** only dequeue **pending** work — **`error` is never auto-retried**. Operators must **retry** or **delete** explicitly.

| Concern | Behavior |
|--------|----------|
| **Pending queue** | `GET /promises/pending` → JSON **array** of `{ promiseId, status, created_at, method, path, target_url, log_folder }` — **`status` is always `pending`**. |
| **Failed tickets** | `GET /promises/errors` → tickets in **`error`**, sorted by `created_at`. Each row includes a short **`error`** string (400 chars max); **`error_truncated: true`** when shortened. Full text: **`?detail=1`**. |
| **Resume** | `POST /promise/{id}/retry` — clears failure metadata and sets **`pending`** so `POST /promise/{id}/execute` (or the daemon) can run again. |
| **Remove** | `DELETE /promise/{id}` — deletes the ticket folder and in-memory cache entry. |
| **Error text on single-ticket GET** | `GET /promise/{id}`, `/response`, `/body_raw` when status is **error**: JSON includes short **`error`**; **`?detail=1`** returns the full message; **`error_truncated`** when applicable. |

**Probe from repo root:** `npm run check:promise-queue` or `node tests/monitor-tasks/check-promise-queue.mjs` — **`GET /health`**, **`/promises/pending`**, and by default **`/promises/errors`** (human lines include **`created_at` / `updated_at`**, **`path`**, **`log_folder`**, error text up to hub limits; use **`--detail`** or **`PROMISES_ERRORS_DETAIL=1`** for hub **`?detail=1`** full errors). **`--json`** prints a structured report for CI. **`--compact`** or **`PROMISES_COMPACT_LOG=1`** = id-only lines. Skip errors: **`PROMISES_CHECK_ERRORS=0`** or **`--no-errors`**. Fail CI if errors queue non-empty: **`--strict`** or **`PROMISES_STRICT=1`**. With **`WEB_BASE=http://127.0.0.1:5173`**, also probes **`GET …/api/a2a/hub/promises/pending`** and **`…/errors`** (non-fatal if Vite is down).

**Correlate with A2A server + client + Gray Room (Markdown report):** from repo root, `npm run report:promise -- <promiseId> --out trace.md` — [`scripts/promise-artifacts-report.mjs`](../../../scripts/promise-artifacts-report.mjs) pulls `proxy_logs/promises/<id>/` together with `a2a-server/storage/requests/{id}.json` and client session steps.

**Same paths via Client API (same origin as Vite or standalone SDK):** `GET /api/a2a/hub/promises/pending`, `GET /api/a2a/hub/promises/errors`, `POST /api/a2a/hub/promise/{id}/retry`, `POST …/execute`, `DELETE /api/a2a/hub/promise/{id}` — proxies to **`AI_HUB_URL`** with an allowlist (`/promises/*`, `/promise/*`).

#### GET /promises/pending

Oldest first. **Only** `pending` — not `error`.

**Response:** JSON array, e.g.:

```json
[
  {
    "promiseId": "abc123…",
    "status": "pending",
    "created_at": "2026-03-20T10:00:00+00:00",
    "created_at_unix": 1710928800,
    "method": "POST",
    "path": "/api/chat",
    "target_url": "http://localhost:11435/api/chat",
    "log_folder": "/path/to/proxy_logs/promises/abc123…"
  }
]
```

#### GET /promises/errors

Tickets in **`error`** (manual handling). Query **`detail=1`** (same values as on `GET /promise/{id}`) for full `error` text per row.

#### GET /promises/ready

Completed `done` promises (sorted by `updated_at`, oldest first).

#### GET /promises/status

Unified `{ "ready": [ ... ] }` — same rows as `/promises/ready`, wrapped under **`ready`**.

#### GET /promise/{promise_id}

**202** + `{ "promiseId", "status": "pending" }` while queued.

**500** + `{ "promiseId", "status": "error", "error": "<short>", "error_truncated"?: true }` on failure.

**200** when `done`: `{ "promiseId", "status": "done", "result_status_code", "result_content_type" }`.

#### DELETE /promise/{promise_id}

**200** `{ "promiseId", "deleted": true }` when removed; **404** if unknown.

#### GET /promise/{promise_id}/request

Original request snapshot (method, path, headers, body).

#### GET /promise/{promise_id}/response

**200** raw body when `done`; **202** pending; **500** JSON error envelope (short **`error`**, optional **`?detail=1`**).

#### GET /promise/{promise_id}/body_raw

When the hub persisted `body_raw.json` on success, returns that **full provider JSON** (OpenAI/Local LLM upstream-style envelope). Used by `a2a-server` `fetchAiHubChatJson` / `pollReadyThenFetch` with `responseMode: raw_json`. **404** if no raw file (older promises or non-JSON upstream).

#### POST /promise/{promise_id}/execute

Execute **pending** promise against Local LLM upstream (non-blocking, **202**). **409** if not `pending` (e.g. still **`error`** — call **`/retry`** first).

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

Reset **`error`** or **`done`** to **`pending`** so **`/execute`** can run again. Idempotent if already **`pending`**.

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
| `local_llm_model_loaded` | Gauge | Model loaded status |
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
Local LLM upstream generate endpoint.

#### POST /api/v1/embed
Local LLM upstream embed endpoint.

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
