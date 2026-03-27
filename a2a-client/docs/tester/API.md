# Tester API (Session + Red Room)

This tester doc is intentionally limited to validating session and red-room behavior.

## Session Endpoints To Test

- `POST /api/a2a/sessions`
- `GET /api/a2a/sessions/{id}`
- `POST /api/a2a/sessions/{id}/next`
- `GET /api/a2a/sessions/{id}/async`
- `GET /api/a2a/sessions/{id}/promise/{promiseId}` (legacy fallback)

## Required Assertions

- `/next` returns ack-first, not full final state
- `/async` eventually settles pending work
- `GET /sessions/{id}` reflects latest finalized step
- Step artifacts are complete and internally consistent

## Red-Room Assertions

- Tool execute result is persisted as next-step `client-result.json`
- Same step receives `request-to-server.json`
- Finalized response lands in same next step (`server-response.json`)

## Out Of Scope

- SSE-only tester transport details
- UI panel control commands
- non-session remote-control commands
