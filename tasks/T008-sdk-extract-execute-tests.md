# T008 — SDK: single execute key invariant

**Golden:** [`CLIENT-SDK-IDEAL.md`](../simulations/CLIENT-SDK-IDEAL.md) — `extractExecuteAction()` uses first key; `response.json` must not bundle two protocol actions.

**Code:** `a2a-client/packages/sdk/src/action-handler.ts` (and callers).

**Goal:** Unit tests cover: (1) one key → dispatch; (2) unexpected multi-key execute fails safe or logs in dev.

**Acceptance:**
- Vitest cases with mock `execute` objects; no change to wire protocol unless a bug is found.
