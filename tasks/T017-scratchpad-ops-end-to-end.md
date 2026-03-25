# T017 — `scratchpad` / `scratchpad_ops` server apply + SDK persistence

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Context fields — `scratchpad_ops` applied server-side then removed from context.

**Code:** [`session-transform.ts`](../a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts) preserves `scratchpad_ops` in edge cases; server transforms include `apply-scratchpad-ops`.

**Goal:** After a full client→server→client round-trip, persisted session state matches the documented lifecycle (ops consumed where spec says so, scratchpad merged correctly).

**Acceptance:**
- One integration or sim-backed test: request with `scratchpad_ops` → response context has updated `scratchpad` and no stale ops (per server rules).
- If behavior differs between Vite and SDK, document and add T001-style parity task.
