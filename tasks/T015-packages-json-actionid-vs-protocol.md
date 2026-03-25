# T015 — `packages/json` flow `actionId` vs A2A action-key `result`

**Golden:** Tool/client **`result`** uses action keys (`read-file`, `rag-search`, …). [`a2a-client/packages/json/src/mapper.ts`](../a2a-client/packages/json/src/mapper.ts) / [`parser.ts`](../a2a-client/packages/json/src/parser.ts) use **`result.actionId`** for Vue/json-flow progress wiring.

**Goal:** Either (a) document that `actionId` is an internal UI correlation ID unrelated to `execute` keys, or (b) align naming with protocol terms to avoid confusion when reading traces.

**Acceptance:**
- Short README or JSDoc on the json package: what `actionId` is and that it is **not** `result.choice` / execute key.
- If duplicate concepts exist, rename in a follow-up task with test updates.
