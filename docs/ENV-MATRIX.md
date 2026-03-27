# Environment Matrix (dev / CI / prod)

Canonical cross-module environment alignment for client, server, and ai-integration.

## URLs and Endpoints

| Variable | dev | CI | prod | Notes |
|---|---|---|---|---|
| `A2A_SERVER_URL` | `http://localhost:3000` | Pipeline server base URL | Public/internal server base URL | Base origin. `.../api/v1` is accepted and normalized by client helpers. |
| `AI_HUB_URL` | `http://localhost:11434` | CI AI hub URL | Internal AI hub URL | Used by `a2a-server` for promise polling and response fetch. |

## Auth and Sync Flags

| Variable | dev | CI | prod | Notes |
|---|---|---|---|---|
| `SKIP_AUTH` | `1` allowed | `1` only in test jobs | `0` required | Dev/test bypass only. Do not use in production. |
| `DEFAULT_SYNC_MODE` | `1` for sync simulations/UI flows | Optional per job | Usually unset/`0` | Async (`promiseId`) remains default production mode. |
| `JWT_SECRET` | Required (>=32 chars) | Required (secret) | Required (secret) | Server auth secret. |
| `ENCRYPTION_KEY` | Required (exactly 32 chars) | Required (secret) | Required (secret) | Required by tests and runtime encryption flows. |

## Polling and Time Budgets

| Variable | dev | CI | prod | Notes |
|---|---|---|---|---|
| `POLL_INTERVAL_MS` | `2000` | `2000` | `2000` (or 1000-5000) | Legacy/default base interval. |
| `POLL_TIMEOUT_MS` | `3600000` | `3600000` | `3600000` or SLO-specific | 1h baseline for long LLM jobs. |
| `LLM_POLL_INTERVAL_MS` | `2000` | `2000` | `2000` (or tuned) | Primary server poll interval (overrides legacy). |
| `LLM_POLL_TIMEOUT_MS` | `3600000` | `3600000` | `<= 86400000` | Primary server poll timeout (overrides legacy, capped at 24h). |
| `PROMISE_TTL_SECONDS` | `86400` | `86400` | `>= LLM_POLL_TIMEOUT_MS/1000` | ai-integration promise retention window. |
| `DAEMON_POLL_INTERVAL` | `4.0` | `4.0` | `4.0` (or tuned) | ai-integration daemon cadence in seconds. |
| `A2A_MAX_INTERRUPT_TURNS` | `10` | `10` | `10` (or policy-driven) | Gray room budget per invoke. |
| `A2A_COMPRESS_HISTORY_MIN_ENTRIES` | `0` | `0` | `0` or tuned | Skip compress sidecar under threshold. |

## Baseline Rules

- Keep `LLM_POLL_TIMEOUT_MS <= PROMISE_TTL_SECONDS * 1000`.
- Keep URL variables environment-specific, never hardcoded per module.
- Keep auth bypass flags (`SKIP_AUTH`) disabled in production.
- When docs/examples change, update root and module `.env.example` together.
