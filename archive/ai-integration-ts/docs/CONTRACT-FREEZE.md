# ai-integration-ts Contract Freeze (v1)

This document freezes externally visible behavior that `ai-integration-ts` must preserve.

## Scope

Drop-in replacement over `http://localhost:11434` for:

- health probes (`/`, `/health`, `/health/ready`)
- promise queue lifecycle (`/promises/*`, `/promise/:id*`)
- LLM async entrypoints (`/api/chat`, `/api/generate`, `/api/embeddings`)
- model discovery (`/api/tags`)
- operator helpers used by monitor and troubleshooting (`/daemon/*`, `/cleanup/*`, `/ui/promises/*`, local upstream control aliases)

## Transport Rules (Frozen)

- LLM write requests return `promiseId` flow (`202 pending`) unless already resolved by cache path.
- Promise states are `pending | done | error`.
- Error payloads keep short `error` by default; optional full text on `?detail=1`.
- Client auth headers are not forwarded to upstream providers; proxy injects upstream auth.

## Promise Endpoints (Frozen Shapes)

- `GET /promises/pending` -> array of pending rows
- `GET /promises/errors` -> array of error rows
- `GET /promises/ready` -> array of done rows
- `GET /promises/status` -> `{ "ready": [...] }`
- `GET /promise/:id` -> `202 pending`, `500 error`, `200 done`
- `GET /promise/:id/request` -> original request snapshot
- `GET /promise/:id/response` -> raw upstream response body on done
- `GET /promise/:id/body_raw` -> parsed stored JSON body if available
- `POST /promise/:id/execute` -> execute pending promise
- `POST /promise/:id/retry` -> reset to pending
- `POST /promise/:id/answer` -> manual done result injection
- `DELETE /promise/:id` -> remove ticket

## Persistence Contract

- Promise artifacts stored under `proxy_logs/promises/<promiseId>/`
- Preserve request snapshot + final body artifacts for monitor diagnostics.

## Compatibility Notes

- Keep monitor compatibility (`npm run monitor:*`, `check:promise-queue`).
- Keep known diagnostic routes available even when no-op internally.
