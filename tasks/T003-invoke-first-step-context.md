# T003 — First invoke matches router golden `request.json`

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Request — first server-level step uses `context.execution` with `action`/`step` (e.g. `simulations/agent/1/request.json`).

**Code:** Client API path that builds the payload for `POST /api/v1/invoke` (`request-to-server.json` shape in runtime storage).

**Goal:** Initial user `{ task: "..." }` becomes a server request whose `context.execution` matches the documented router contract (not an ad-hoc empty object).

**Acceptance:**
- Pick one reference sim (e.g. `agent/1`); add or extend an integration test that the built request JSON matches the golden’s `context.execution` pattern for step 1.
- No change to golden files unless the **documented** contract in SCHEMA is intentionally updated.
