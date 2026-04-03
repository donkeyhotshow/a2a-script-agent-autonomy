# ADR-0054: Real-time Update Contracts — superseded

- **Status:** Superseded (2026-04-03)
- **Date:** 2026-04-01 (original)
- **Supersession:** This repository does **not** implement WebSocket (or SSE) for Client API / web UI. Updates use **HTTP polling** (`GET /api/a2a/sessions/:id/async`, `GET …/sessions/:id`, etc.) per `AGENTS.md` and `docs/OPERATOR-CURL.md`.

## Normative contract

- **Transport:** HTTP only for session/async state; no `ws:` endpoints and no browser WebSocket client in `a2a-client`.
- **Fallback:** N/A — polling is the primary path, not a fallback to WebSocket.

Earlier drafts of this ADR described WebSocket topics; they are **not** part of the implementation and should not be cited for current behavior.
