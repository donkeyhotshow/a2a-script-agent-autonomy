# T009 — `context.workbench` merge (server + SDK)

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) context note; [`a2a-server/docs/LLM-REQUEST-PREP.md`](../a2a-server/docs/LLM-REQUEST-PREP.md) for normalization.

**Code:**
- Server response transforms / `workbench_ops`
- `a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts`

**Goal:** After a server round-trip, persisted session state preserves `workbench.sections` (and slots if used) the same way goldens imply—no silent drops on the client merge path.

**Acceptance:**
- One focused test: server-shaped `response` with `context.workbench` → merged session matches expected fields.
- If gap found, fix merge first, then add sim coverage if needed.
