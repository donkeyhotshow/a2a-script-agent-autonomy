# Operator Hints Catalog

## Purpose

Provide short, actionable hints for operators who verify agent work after Task Monitor runs.

## Canonical Loop

1. Run monitor (`npm run monitor` or `npm run monitor:once`).
2. Export completed mapping (`npm run monitor:completed:json`).
3. Manually verify session/promise signals.
4. Record evidence in `DEV_STATE.md`.
5. Convert gaps into `tasks/pending/`.

Primary protocol: [docs/OPERATOR-MONITOR-MANUAL-QA.md](./OPERATOR-MONITOR-MANUAL-QA.md).

## Batch Mode (Recommended)

Use small batches (`1-3` prompts), then pause for manual QA:

1. Run `npm run monitor:once`.
2. Verify one processed prompt end-to-end.
3. Log evidence and next actions.
4. Repeat.

For larger queue burn, use `npm run monitor` but still perform QA checkpoints every few completed prompts.

## Symptom -> Hint -> Link

| Symptom | Hint | Source |
|---|---|---|
| Session stuck at router | Re-open session state and apply two-beat rule (`message` vs `choice`) on the same `sessionId`. | [docs/OPERATOR-CURL.md](./OPERATOR-CURL.md), [docs/AGENTS-REFERENCE.md](./AGENTS-REFERENCE.md) |
| Async never settles | Continue `/async` polling, inspect hub promise queue/errors, generate promise report. | [MONITOR-QUICK-START.md](../MONITOR-QUICK-START.md), [scripts/promise-artifacts-report.mjs](../scripts/promise-artifacts-report.mjs) |
| Contract/shape drift | Run offline direct tests/validators before another live run. | [tests/direct-tests/README.md](../tests/direct-tests/README.md), [tests/direct-tests/validators/README.md](../tests/direct-tests/validators/README.md) |
| Queue looks empty | Run prune -> discover -> write tasks, then monitor again. | [AGENTS.md](../AGENTS.md), [tasks/README.md](../tasks/README.md) |
| Not sure which tests to run | Pick commands from operator matrix by scope, then log pass/fail in state. | [docs/OPERATOR-TESTING-MATRIX.md](./OPERATOR-TESTING-MATRIX.md) |
| Need startup/restart decision | Follow system startup policy; avoid full restart after normal edits. | [docs/SYSTEM_STARTUP.md](./SYSTEM_STARTUP.md) |

## Evidence Checklist (Per Finding)

1. `sessionId` (and `promiseId` when available).
2. Terminal signal (`completed` / `failed` / `timeout`).
3. One checked condition (what was verified manually).
4. Follow-up task link if failure/gap exists.
5. `DEV_STATE.md` entry with date/time and command(s).

# Environment Matrix (dev / CI / prod)

Canonical cross-module environment alignment for client, server, and ai-integration.

## URLs and Endpoints

| Variable | dev | CI | prod | Notes |
|---|---|---|---|---|
| `A2A_SERVER_URL` | `http://localhost:3000` | Pipeline server base URL | Public/internal server base URL | Base origin. `.../api/v1` is accepted and normalized by client helpers. |
| `AI_HUB_URL` | `http://localhost:11434` | CI AI hub URL | Internal AI hub URL | Used by `a2a-server` for promise polling and response fetch. |
| `A2A_PREVIEW_URL` | `http://localhost:5173` | CI client URL | Public client URL | Client preview URL for screenshot capture in gray room. Defaults to Vite dev server. |

## Auth and Sync Flags

| Variable | dev | CI | prod | Notes |
|---|---|---|---|---|
| `SKIP_AUTH` | `1` allowed | `1` only in test jobs | `0` required | Dev/test bypass only. Do not use in production. |
| `JWT_SECRET` | Required (>=32 chars) | Required (secret) | Required (secret) | Server auth secret. |
| `ENCRYPTION_KEY` | Required (exactly 32 chars) | Required (secret) | Required (secret) | Required by tests and runtime encryption flows. |
| `ALLOW_TOOLS_EVOLVE` | unset (=disabled) | unset | unset | Admin-only flag for dangerous `/api/tools/evolve` endpoint. Enable only in dev. |
| `NODE_ENV` | `development` | unset or `production` | unset or `production` | Controls error detail exposure; only `development` exposes stacks and internal messages. |
| `A2A_ERROR_EXPOSE_DETAILS` | unset (use NODE_ENV) | unset (use NODE_ENV) | unset (use NODE_ENV) | Force enable error detail exposure regardless of NODE_ENV when set to `1` or `true`. |

## Polling and Time Budgets

| Variable | dev | CI | prod | Notes |
|---|---|---|---|---|
| `POLL_INTERVAL_MS` | `2000` | `2000` | `2000` (or 1000-5000) | Legacy/default base interval. |
| `POLL_TIMEOUT_MS` | `3600000` | `3600000` | `3600000` or SLO-specific | 1h baseline for long LLM jobs. |
| `LLM_POLL_INTERVAL_MS` | `2000` | `2000` | `2000` (or tuned) | Primary server poll interval (overrides legacy). |
| `LLM_POLL_TIMEOUT_MS` | `3600000` | `3600000` | `<= 86400000` | Primary server poll timeout (overrides legacy, capped at 24h). |
| `PROMISE_TTL_SECONDS` | `86400` | `86400` | `>= LLM_POLL_TIMEOUT_MS/1000` | ai-integration promise retention window. |
| `DAEMON_POLL_INTERVAL` | `4.0` | `4.0` | `4.0` (or tuned) | ai-integration daemon cadence in seconds. |
| `A2A_MAX_INTERRUPT_TURNS` | `10` | `10` | `10` (or policy-driven) | Gray room interrupt budget per invoke (overrides `A2A_GRAY_ROOM_MAX_TURNS` when set). |
| `A2A_GRAY_ROOM_ENABLED` | unset (=on) or `1` | unset or `1` | policy | Default **on** when unset; set `0`/`false`/`off` to skip interrupt expansion (one response transform). |
| `A2A_GRAY_ROOM_MAX_TURNS` | `10` | `10` | `10` | Fallback budget when `A2A_MAX_INTERRUPT_TURNS` unset. |
| `A2A_COMPRESS_HISTORY_MIN_ENTRIES` | `0` | `0` | `0` or tuned | Skip compress sidecar under threshold. |
| `FORWARD_TIMEOUT_SECONDS` | `30` | `30` | tuned | ai-integration proxy forward timeout in seconds. 0 = unlimited. |
| `PROVIDER_TIMEOUT` | `30` | `30` | tuned | ai-integration provider session timeout in seconds. 0 = unlimited. |
| `VISION_MOCK_MODE` | `deterministic` | `deterministic` | `deterministic` | Controls vision tester mock behavior: 'always_pass', 'always_fail', 'random', or 'deterministic' (default). Deterministic mode uses hash of inputs for consistent results. |

## Baseline Rules

- Keep `LLM_POLL_TIMEOUT_MS <= PROMISE_TTL_SECONDS * 1000`.
- Keep URL variables environment-specific, never hardcoded per module.
- Keep auth bypass flags (`SKIP_AUTH`) disabled in production.
- When docs/examples change, update root and module `.env.example` together.