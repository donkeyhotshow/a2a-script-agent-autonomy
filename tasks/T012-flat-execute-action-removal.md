# T012 — Remove flat `execute.action` assumptions in client/tests

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) — `execute` uses **action keys**, not `execute.action` + siblings.

**Code:** e.g. [`a2a-client/tests/unit/session-store.test.ts`](../a2a-client/tests/unit/session-store.test.ts) (`execute.action`), [`session-storage.test.js`](../a2a-client/tests/integration/session-storage.test.js).

**Goal:** Tests and UI helpers use `Object.keys(execute)[0]` or shared `extractExecuteAction` logic—same as SDK—so regressions catch invalid server shapes.

**Acceptance:**
- No test asserts `execute.action` unless explicitly testing a **deprecated** backward-compat branch (then gate with a comment + ticket).
