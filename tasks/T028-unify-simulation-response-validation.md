# T028 — Two validators: `validateSimulationResponse` vs `validateActionResponse`

**Code:**
- [`a2a-server/tests/simulation-based.test.ts`](../a2a-server/tests/simulation-based.test.ts) — local `validateSimulationResponse` checks `success`, `data.status`, `data.execute`/`result`.
- [`a2a-server/src/actions/action-validator.ts`](../a2a-server/src/actions/action-validator.ts) — `validateActionResponse` for action-key shapes.

**Goal:** Reduce drift: either wrap invoke **envelope** validation once, then call `validateActionResponse` on `data`, or share error message format so fixing T025 updates both paths.

**Acceptance:**
- Refactor test helper to import from `action-validator` where possible; document what stays test-only (promiseId, status enum).
