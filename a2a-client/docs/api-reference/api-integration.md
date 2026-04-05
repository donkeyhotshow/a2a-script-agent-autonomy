# APIIntegration API Reference (Session + Red Room)

This reference only covers APIs needed for session correctness and red-room execution.

## Base Path

Use `/api/a2a` routes.

## Core Methods

### `api.createSession(sessionData?)`

Creates session via `POST /api/a2a/sessions`.

### `api.getSessions()`

Loads sessions via `GET /api/a2a/sessions`.

### `api.getSession(sessionId, options?)`

Loads full session state via `GET /api/a2a/sessions/{id}`. Optional **`options.includeContext`** adds `?includeContext=1` (debug; **403** when the Vite app runs in **production**). The web Client API returns the session DTO at the JSON root (no `{ success, session }`); standalone SDK defaults to the envelope unless you use `?unwrap=1` — see [ADR-0028](../../../docs/adr/ADR-0028-client-api-deployment-modes.md).

### `api.sendMessage(sessionId, message)`

Submits a user turn to `POST /api/a2a/sessions/{id}/next`.

Return is ack-first (`accepted`, `step`, `asyncPending`; no transport `promiseId` in the ack JSON).

### `api.sendChoice(sessionId, choiceId, choiceData?)`

Submits routing/form choice to the same `POST /sessions/{id}/next` path.

### `api.pollAsync(sessionId)`

Polls active pending work via `GET /api/a2a/sessions/{id}/async`.

### `api.getPromiseResult(sessionId, promiseId)`

Legacy fallback poll via `GET /api/a2a/sessions/{id}/promise/{promiseId}`.

## Ack-First Rule

`POST /next` does not return final execute/context payload. Final state must be read from:

1. `GET /api/a2a/sessions/{id}/async` while pending
2. `GET /api/a2a/sessions/{id}` for settled state

## Red-Room Note

When an `execute` action requires client completion, APIIntegration must send the tool result as the next turn and run the same ack -> poll -> reload sequence.

## Related

- [../session-management-protocols.md](../session-management-protocols.md)
- [../RED-ROOM.md](../RED-ROOM.md)