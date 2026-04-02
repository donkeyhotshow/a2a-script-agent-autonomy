# Production Test Harness

> **⚠️ DEPRECATED**: Use `tests/direct-tests/run-checks.ps1` instead.

## Overview

The `scripts/prod-test.js` helper exercises the real production stack in three slices (client → server → Ollama, server-only, and Ollama-only) and saves every request/response pair to `tmp/prod-test-results/<timestamp>/`.

## Request Definitions

Every mode has a curated list of JSON blobs inside `a2a-server/docs/production/test-requests/`:

- `client.json` — context/message pairs that mimic a Web client hitting `POST /api/v1/invoke` on the client proxy (port 3001) and flowing through the server and Ollama.
- `server.json` — the same contexts sent directly to `POST /api/v1/invoke` on the server API (port 3000).
- `ollama.json` — raw Ollama payloads (`model` + `prompt`) that land at `POST /api/generate` on direct Ollama (port 11435).

These files live in Git so the script always runs the same deterministic checks.

## Running the Harness

```bash
node scripts/prod-test.js [options]
```

### Available Options

- `--mode <client|server|ollama|all>` — choose a subset of the three modes; repeat the flag or pass comma-separated values. `all` (the default) runs every floor.
- `--output <dir>` — override the result folder (default `tmp/prod-test-results/<timestamp>`).
- `--client-url`, `--server-url`, `--ollama-url` — override the base URLs used for each mode (defaults: `http://localhost:3001`, `http://localhost:3000`, `http://localhost:11435`).
- `--auth <value>` — value for the `Authorization` header. If omitted and `A2A_SERVER_PASSWORD` is set, the script uses `Bearer <password>` automatically.
- `--label <tag>` — append a sanitized tag to the timestamped run folder so you can recognize the output later.
- `--skip-model-check` — the Ollama-only mode skips the model availability preflight (useful when Ollama is not reachable from this host).
- `--list` — print the mode descriptions and exit.
- `--no-prompt` — skip the interactive menu when no `--mode` is provided. Without this flag you get a simple "button pad" prompt that lets you type `1`/`2`/`3`/`4` to run exactly the checks you want; hitting `Enter` selects all.
- `--help` or `-h` — show usage.

## Output Structure

- Each mode gets its own directory under the run root (`client/`, `server/`, `ollama/`).
- Every test produces one JSON file named `<index>-<safe-name>.json` describing:
  - `meta`: mode, labels, timestamps, URL, method, duration
  - `request`: headers/body that were sent
  - `response`: status, headers, `body` (parsed JSON or raw text), `rawBody`
  - `error`: any fetch or HTTP error message
- A global `summary.json` aggregates all requests with paths relative to the run root so you can quickly report what succeeded/failed.

## Authentication & Environment

- The server requires `Authorization`. Either set `A2A_SERVER_PASSWORD` so the script can derive `Bearer <password>`, pass `--auth "Bearer XXX"` manually, or run with `SKIP_AUTH=1` (development only).
- Ensure the stack is running (`npm run dev` or equivalent) before invoking the script. If `SYSTEM_SCHEMA.md` is added, place it beside this doc under `a2a-server/docs/production/`.
- The script queries `http://<OLLAMA_URL>/api/tags` and, if `qwen3:8b` is missing, attempts `ollama pull qwen3:8b` via the host CLI before sending prod-test requests (skip with `--skip-model-check` if you prefer to manage models manually).

## Endpoints Summary

### Server Mode (`--mode server`)

- **URL**: `POST http://localhost:3000/api/v1/invoke`
- **Auth**: Required (Bearer token)
- **Note**: The endpoint `/invoke` without `/api/v1` prefix returns 404 on current server version. Use `/api/v1/invoke`.

### Client Mode (`--mode client`)

- **URL**: `POST http://localhost:3001/api/v1/invoke`
- **Auth**: Required (Bearer token)
- **Note**: The client proxy forwards requests to the server. If client API is not running, the test will fail.

### Ollama Mode (`--mode ollama`)

- **URL**: `POST http://localhost:11435/api/generate`
- **Auth**: None required
- **Note**: Direct Ollama runs on port 11435. Use ai-integration proxy port 11434 only if it's properly configured to connect to Ollama.

## Examples

```bash
# Run every mode and keep the output in a timestamped folder
node scripts/prod-test.js

# Run only the Ollama check and share a custom folder
node scripts/prod-test.js --mode ollama --output tmp/last-llm-check

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
- Make sure to use port 11435 (direct Ollama) or 11434 (ai-integration proxy) correctly.
- Check if Ollama is running: `curl http://localhost:11435/api/tags`

**Model not found (`model 'qwen3:8b' not found`)**
- Ensure the model is available in Ollama: `curl http://localhost:11435/api/tags`
- If using ai-integration proxy on 11434, check OLLAMA_HOST configuration

**Empty models list**
- For direct Ollama (11435): Check if Ollama is running and models are loaded
- For ai-integration proxy (11434): Check OLLAMA_HOST in config - it should point to actual Ollama port (11435)

### Port Configuration Issue

**Current Setup:**
- Direct Ollama: Port 11435 (PID 29572 - python3.13.exe - ai-integration crashed)
- AI Integration Proxy: Port 11434 (PID 45752 - ollama.exe - direct Ollama started on 11434 by mistake)

This is wrong! Ollama should be on 11435, and ai-integration proxy should connect to it.

**Fix:**
1. Stop all services
2. Make sure OLLAMA_HOST in ai-integration/config is set to `http://localhost:11435`
3. Start Ollama first: `ollama serve`
4. Then start ai-integration: `python -m proxy`
5. Finally start a2a-server

## Health Check Endpoints

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| a2a-server | 3000 | `GET http://localhost:3000/health` |
| a2a-server | 3000 | `GET http://localhost:3000/health/ready` |
| AI Integration proxy | 11434 | `GET http://localhost:11434/` (returns empty if not Flask) |
| Ollama (direct) | 11435 | `GET http://localhost:11435/api/tags` |

Run these commands to verify services are running:

```bash
# Check server health
curl -s http://localhost:3000/health

# Check Ollama models (direct)
curl -s http://localhost:11435/api/tags
```
