# Production Test Harness

> **⚠️ DEPRECATED**: Use `tests/direct-tests/run-checks.ps1` instead.

**Stack triage (triangle):** Day-to-day gate for layer **C** is the AI hub — `GET http://localhost:11434/health` (see [`docs/TRIANGLE-WORKFLOW.md`](../../../docs/TRIANGLE-WORKFLOW.md)). `run-checks.ps1` uses **`-AiProxyUrl http://localhost:11434`** for that layer. This harness’s **`compat_llm`** mode still posts to a **direct** upstream base URL (default **`http://localhost:11435`**) when you want to hit `POST …/api/generate` without the proxy.

## Overview

The `scripts/prod-test.js` helper exercises the real production stack in three slices (client → server → Local LLM upstream, server-only, and Local LLM upstream-only) and saves every request/response pair to `tmp/prod-test-results/<timestamp>/`.

## Request Definitions

Every mode has a curated list of JSON blobs inside `a2a-server/docs/production/test-requests/`:

- `client.json` — context/message pairs that mimic a Web client hitting `POST /api/v1/invoke` on the client proxy (port 3001) and flowing through the server and Local LLM upstream.
- `server.json` — the same contexts sent directly to `POST /api/v1/invoke` on the server API (port 3000).
- `compat_llm.json` — raw Local LLM upstream payloads (`model` + `prompt`) that land at `POST /api/generate` on direct Local LLM upstream (port 11435).

These files live in Git so the script always runs the same deterministic checks.

## Running the Harness

```bash
node scripts/prod-test.js [options]
```

### Available Options

- `--mode <client|server|compat_llm|all>` — choose a subset of the three modes; repeat the flag or pass comma-separated values. `all` (the default) runs every floor.
- `--output <dir>` — override the result folder (default `tmp/prod-test-results/<timestamp>`).
- `--client-url`, `--server-url`, `--compat_llm-url` — override the base URLs used for each mode (defaults: `http://localhost:3001`, `http://localhost:3000`, `http://localhost:11435`).
- `--auth <value>` — value for the `Authorization` header. If omitted and `A2A_SERVER_PASSWORD` is set, the script uses `Bearer <password>` automatically.
- `--label <tag>` — append a sanitized tag to the timestamped run folder so you can recognize the output later.
- `--skip-model-check` — the Local LLM upstream-only mode skips the model availability preflight (useful when Local LLM upstream is not reachable from this host).
- `--list` — print the mode descriptions and exit.
- `--no-prompt` — skip the interactive menu when no `--mode` is provided. Without this flag you get a simple "button pad" prompt that lets you type `1`/`2`/`3`/`4` to run exactly the checks you want; hitting `Enter` selects all.
- `--help` or `-h` — show usage.

## Output Structure

- Each mode gets its own directory under the run root (`client/`, `server/`, `compat_llm/`).
- Every test produces one JSON file named `<index>-<safe-name>.json` describing:
  - `meta`: mode, labels, timestamps, URL, method, duration
  - `request`: headers/body that were sent
  - `response`: status, headers, `body` (parsed JSON or raw text), `rawBody`
  - `error`: any fetch or HTTP error message
- A global `summary.json` aggregates all requests with paths relative to the run root so you can quickly report what succeeded/failed.

## Authentication & Environment

- The server requires `Authorization`. Either set `A2A_SERVER_PASSWORD` so the script can derive `Bearer <password>`, pass `--auth "Bearer XXX"` manually, or run with `SKIP_AUTH=1` (development only).
- Ensure the stack is running (`npm run dev` or equivalent) before invoking the script. If `SYSTEM_SCHEMA.md` is added, place it beside this doc under `a2a-server/docs/production/`.
- The script queries `http://<LOCAL_LLM_UPSTREAM_URL>/api/tags` and, if `qwen3:8b` is missing, attempts to pull it with your local LLM CLI before sending prod-test requests (skip with `--skip-model-check` if you prefer to manage models manually).

## Endpoints Summary

### Server Mode (`--mode server`)

- **URL**: `POST http://localhost:3000/api/v1/invoke`
- **Auth**: Required (Bearer token)
- **Note**: The endpoint `/invoke` without `/api/v1` prefix returns 404 on current server version. Use `/api/v1/invoke`.

### Client Mode (`--mode client`)

- **URL**: `POST http://localhost:3001/api/v1/invoke`
- **Auth**: Required (Bearer token)
- **Note**: The client proxy forwards requests to the server. If client API is not running, the test will fail.

### Local LLM upstream Mode (`--mode compat_llm`)

- **URL**: `POST http://localhost:11435/api/generate`
- **Auth**: None required
- **Note**: Direct Local LLM upstream runs on port 11435. Use ai-integration proxy port 11434 only if it's properly configured to connect to Local LLM upstream.

## Examples

```bash
# Run every mode and keep the output in a timestamped folder
node scripts/prod-test.js

# Run only the Local LLM upstream check and share a custom folder
node scripts/prod-test.js --mode compat_llm --output tmp/last-llm-check

# Run client + server with manual auth
node scripts/prod-test.js --mode client --mode server --auth "Bearer my-secret-token"

# List available modes
node scripts/prod-test.js --list
```

## Troubleshooting

### Common Errors

**404 on `/invoke`**
- Use `/api/v1/invoke` instead. The server routes have changed.

**404 on `/api/generate`**
- Make sure to use port 11435 (direct Local LLM upstream) or 11434 (ai-integration proxy) correctly.
- Check if Local LLM upstream is running: `curl http://localhost:11435/api/tags`

**Model not found (`model 'qwen3:8b' not found`)**
- Ensure the model is available in Local LLM upstream: `curl http://localhost:11435/api/tags`
- If using ai-integration proxy on 11434, check LOCAL_LLM_UPSTREAM_URL configuration

**Empty models list**
- For direct Local LLM upstream (11435): Check if Local LLM upstream is running and models are loaded
- For ai-integration proxy (11434): Check LOCAL_LLM_UPSTREAM_URL in config - it should point to actual Local LLM upstream port (11435)

### Port Configuration Issue

**Current Setup:**
- Direct Local LLM upstream: Port 11435 (PID 29572 - python3.13.exe - ai-integration crashed)
- AI Integration Proxy: Port 11434 (PID 45752 - compat_llm.exe - direct Local LLM upstream started on 11434 by mistake)

This is wrong! Local LLM upstream should be on 11435, and ai-integration proxy should connect to it.

**Fix:**
1. Stop all services
2. Make sure LOCAL_LLM_UPSTREAM_URL in ai-integration/config is set to `http://localhost:11435`
3. Start Local LLM upstream first: `compat_llm serve`
4. Then start ai-integration: `python -m proxy`
5. Finally start a2a-server

## Health Check Endpoints

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| AI Integration (hub) | 11434 | `GET http://localhost:11434/health` (primary **C1** gate) |
| a2a-server | 3000 | `GET http://localhost:3000/health` |
| a2a-server | 3000 | `GET http://localhost:3000/health/ready` |
| Local LLM upstream (direct, optional) | 11435 | `GET http://localhost:11435/api/tags` — only if you run a local upstream; not started by repo `start-all` |

```bash
curl -s http://localhost:11434/health
curl -s http://localhost:3000/health
# If using a local upstream on 11435:
curl -s http://localhost:11435/api/tags
```
