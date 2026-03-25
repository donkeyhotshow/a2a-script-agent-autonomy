# T010 — Raw execute vs Web DTO (`includeContext`)

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) — `received.json` is sanitized; debug/unsanitized path documented.

**Code:** `GET /api/a2a/sessions/:id` and SDK equivalents; `includeContext` / `buildWebExecute` usage in `sessions.ts`, `web-session-dto.js`.

**Goal:** API docs and behavior agree: when the Web UI calls the default route, it always gets DTO-sanitized `execute`; tooling that needs raw tool keys uses the explicit debug/query flag only.

**Acceptance:**
- Table in code comment or existing API doc: parameter → `execute` shape (raw vs DTO).
- Regression test for one route if behavior was ambiguous.
