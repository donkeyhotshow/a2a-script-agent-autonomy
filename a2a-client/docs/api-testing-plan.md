# API Testing Plan (Session + Red Room)

This plan verifies only:

1. Session artifact correctness
2. Ack-first flow
3. Async completion
4. Red-room auto-execution cycle

## Prerequisites

- Web UI Client API available at `http://localhost:5173/api/a2a`
- A2A server available at `http://localhost:3000`

## 1) Create Session

`POST /api/a2a/sessions`

Checks:

- Response includes `session.id`
- Step `1/` contains `server-response.json` and `messages.json`

## 2) Submit User Turn (Ack-First)

`POST /api/a2a/sessions/{id}/next`

Checks:

- Response is ack-first (`accepted`, `step`, `asyncPending`, optional `promiseId`)
- Do not treat this response as final state

## 3) Resolve Final State

If `asyncPending=true`:

- Poll `GET /api/a2a/sessions/{id}/async` until complete

Then:

- Load `GET /api/a2a/sessions/{id}`
- Verify final `execute`, `context`, and merged messages are present

## 4) Verify Step Artifacts

For each completed step:

- `client-result.json` exists for user/tool input
- `request-to-server.json` exists before invoke
- `server-promise.json` exists only while async is pending
- `server-response.json` exists when step is finalized
- `messages.json` exists and is mergeable across steps

## 5) Red-Room Flow

When server asks client to execute a tool action:

1. Client writes tool output into next-step `client-result.json`
2. Client sends `POST /sessions/{id}/next`
3. Client follows ack -> async poll (if needed) -> `GET /sessions/{id}`
4. Finalized step contains `server-response.json`

Checks:

- Step numbering remains linear
- No missing artifacts in the red-room turn
- Reload can recover pending state from files

## 6) Failure Cases

- Missing `request-to-server.json` before invoke -> fail
- `server-promise.json` never replaced by `server-response.json` after completion -> fail
- Session endpoint returns stale state not matching latest finalized step -> fail
- Execute/result not in action-key shape -> fail

## Minimal Acceptance Checklist

- [ ] `/api/a2a/sessions` create/load works
- [ ] `/next` is ack-first
- [ ] `/async` resolves pending work
- [ ] Session rebuild matches highest finalized step
- [ ] Red-room cycle produces complete next-step artifacts
