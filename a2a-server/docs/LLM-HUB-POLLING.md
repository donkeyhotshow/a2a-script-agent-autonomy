## LLM Hub Polling (A2A Server → AI Hub)

This document describes how the server polls the AI Hub (ai-integration / Ollama proxy) for LLM promise completion and which environment variables control the behavior.

### Env variables and precedence

- **`LLM_POLL_INTERVAL_MS`**: primary poll interval (ms) for checking hub promise completion (`GET /promise/:id`).
- **`POLL_INTERVAL_MS`**: legacy/default interval (ms). Used when `LLM_POLL_INTERVAL_MS` is unset.
- **`LLM_POLL_TIMEOUT_MS`**: primary timeout budget (ms) for waiting on a single LLM promise.
- **`POLL_TIMEOUT_MS`**: legacy/default timeout (ms). Used when `LLM_POLL_TIMEOUT_MS` is unset.

Precedence:

1. `LLM_POLL_INTERVAL_MS` / `LLM_POLL_TIMEOUT_MS` (if set)
2. `POLL_INTERVAL_MS` / `POLL_TIMEOUT_MS` (if set)
3. Hard defaults from `src/daemon/llm-hub-poll.ts`

### Implementation (server side)

Polling implementation lives in `src/daemon/llm-hub-poll.ts`:

- Interval is computed as:
  - `LLM_POLL_INTERVAL_MS` if set, else `POLL_INTERVAL_MS` if set, else `2000` ms.
  - Clamped to `1000–120000` ms for safety.
- Timeout is computed as:
  - `LLM_POLL_TIMEOUT_MS` if set, else `POLL_TIMEOUT_MS` if set, else `3_600_000` ms (1 hour).
  - Clamped to a maximum of `86_400_000` ms (24 hours).

The poller loops on **`GET {AI_HUB_URL}/promise/{llmPromiseId}`** until the JSON body reports `status: "done"` (HTTP 200), then fetches **`GET …/promise/{id}/response`** (or `body_raw` when `responseMode` is `raw_json`). It does **not** depend on `GET /promises/status`’s bulk `ready` list, so completion matches the `resolveLlmPromiseRecovery` path in `llm-hub-poll.ts`. If the promise stays `202` pending until the timeout window, it throws `LLM promise timeout`.

### Timeout budget and ai-integration alignment

The ai-integration daemon config (`ai-integration/proxy/config.py`) uses:

- `PROMISE_TTL_SECONDS` (default `86400`, i.e. 24h) — lifetime of a promise record.
- Daemon poll/execute settings (`DAEMON_POLL_INTERVAL`, `DAEMON_EXECUTE_TIMEOUT`, etc.) — control how often and how long background workers execute pending promises.

To keep behavior consistent and avoid server-side polling a promise that has already expired:

- Recommended:
  - `LLM_POLL_TIMEOUT_MS` ≤ `PROMISE_TTL_SECONDS * 1000` (defaults already satisfy this: 1h vs 24h).
  - Keep `LLM_POLL_INTERVAL_MS` in the `1–5` s range for interactive workloads (default `2000` ms).
- Hard cap:
  - The server always caps `LLM_POLL_TIMEOUT_MS` to `86_400_000` ms (24h), matching the default `PROMISE_TTL_SECONDS`.

### Quick reference (.env)

From `.env.example`:

- `POLL_INTERVAL_MS=2000`
- `POLL_TIMEOUT_MS=3600000`
- `LLM_POLL_TIMEOUT_MS=3600000`
- `LLM_POLL_INTERVAL_MS=2000`

These values give:

- ~2s polling cadence.
- 1h timeout budget per LLM promise.
- Upper bound aligned with ai-integration default `PROMISE_TTL_SECONDS` (24h).

