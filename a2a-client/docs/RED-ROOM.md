# Red Room (Execution Cycle)

Red room means the client performs an automatic follow-up turn after receiving a tool `execute` request.

## Trigger

- Server returns an `execute` action that requires client-side completion.
- Client runs the requested tool/UI action and captures the result payload.

## Required Cycle

1. Save result in the next step as `client-result.json`.
2. Build `request-to-server.json` using previous context + new result.
3. Call `POST /api/a2a/sessions/{id}/next`.
4. If ack reports `asyncPending=true`, poll `GET /api/a2a/sessions/{id}/async`.
5. Finalize the same step with `server-response.json` (+ `messages.json`).

## Correctness Rules

- Keep action-key shape for execute/result payloads.
- Do not skip step artifacts; files are the source of truth.
- Do not treat ack response as final session state.
- On reload, state must recover from persisted step files and continue polling if pending.

## Related

- [GRAY-ROOM.md](./GRAY-ROOM.md) — server-only chain (not an extra client turn)
- [session-management-protocols.md](./session-management-protocols.md)
- [SESSION-STORAGE.md](./SESSION-STORAGE.md)
- [WEB_UI_PROTOCOL.md](./WEB_UI_PROTOCOL.md)
