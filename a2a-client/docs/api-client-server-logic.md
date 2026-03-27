# API Client-Server Logic (Current)

Scope: session correctness and red-room execution only.

## Core Contract

- Web UI uses `/api/a2a/*`.
- `POST /api/a2a/sessions/{id}/next` returns ack-first.
- Final state is read from `GET /api/a2a/sessions/{id}`.
- While pending, poll `GET /api/a2a/sessions/{id}/async`.

## Step Lifecycle

For a new user/tool result on step `N`:

1. Persist `N/client-result.json`
2. Build and persist `(N+1)/request-to-server.json`
3. Invoke A2A server
4. If async: write `(N+1)/server-promise.json`
5. On completion: write `(N+1)/server-response.json` and `(N+1)/messages.json`

## Session Source of Truth

- Highest step containing `server-response.json` is authoritative.
- Session view is rebuilt from step artifacts, not from a root `session.json`.

## Red-Room Integration

Red room is an automatic follow-up cycle:

1. Server returns tool `execute`
2. Client runs tool and records output as next-step `client-result.json`
3. Client sends `/next` and follows standard ack/poll/reload flow

Red-room is not a separate protocol; it is a standard step lifecycle with automatic input origin.

## Guardrails

- Keep action-key shape for `execute` and `result`.
- Do not skip writing step artifacts.
- Do not expose transport internals as UI contract.
