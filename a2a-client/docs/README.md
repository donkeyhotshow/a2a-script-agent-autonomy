# A2A Client Docs (Focused)

This folder is now focused on:

1. Session correctness (step files, async flow, recovery)
2. Red-room execution (client auto tool cycle)
3. Gray-room behavior as seen from the Web client (server-side chain; see server doc for protocol)

## Read These First

- [WEB_UI_PROTOCOL.md](./WEB_UI_PROTOCOL.md) - source of truth for Web UI contract
- [GOLDEN-SIMULATIONS-CHECKLIST.md](./GOLDEN-SIMULATIONS-CHECKLIST.md) - client checklist for sanitized `received.json` Web DTO
- [SESSION-STORAGE.md](./SESSION-STORAGE.md) - session file layout and step lifecycle
- [RED-ROOM.md](./RED-ROOM.md) - auto-execute cycle contract
- [GRAY-ROOM.md](./GRAY-ROOM.md) - server-only substeps (client view)
- [api-client-server-logic.md](./api-client-server-logic.md) - request/response flow per step
- [api-testing-plan.md](./api-testing-plan.md) - practical verification checklist
- [tester/API.md](./tester/API.md) - tester endpoints
- [tester/INTEGRATION.md](./tester/INTEGRATION.md) - tester integration behavior

## Contract Guardrails

- Use `/api/a2a/*` endpoints for Web UI flows.
- `POST /sessions/:id/next` returns ack-first; load state via `GET /sessions/:id`.
- Async state is polled via `GET /sessions/:id/async` (or legacy promise endpoint).
- Step artifacts are the source of truth, not a root `session.json`.

## Cleanup Scope

Legacy workflow/UI architecture docs outside this scope were removed. If any remaining document conflicts with the files listed in "Read These First", treat it as stale.