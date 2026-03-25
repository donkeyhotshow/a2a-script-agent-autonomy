# T022 — SDK auth middleware: validation TODOs

**Code:** [`a2a-client/packages/sdk/src/server/server/middleware/auth.ts`](../a2a-client/packages/sdk/src/server/server/middleware/auth.ts) — TODOs for project access validation and request schema validation.

**Goal:** Align standalone SDK deployments with the same safety assumptions as the Vite Client API (sessions, projects), or explicitly document “dev-only / SKIP_AUTH” gaps.

**Acceptance:**
- Either implement minimal validation hooks or add ADR-style “known gaps” with references to env flags.
