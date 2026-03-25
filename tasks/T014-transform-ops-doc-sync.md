# T014 — Transform pipeline ops list: code vs SCHEMA vs `transform/index` header

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Transform operations (full table).

**Code:** [`a2a-server/src/transform/index.ts`](../a2a-server/src/transform/index.ts) module comment lists only a **subset** of ops; implementation in [`pipeline.ts`](../a2a-server/src/transform/pipeline.ts) / [`operations.ts`](../a2a-server/src/transform/operations.ts) is richer.

**Goal:** The file-level doc matches what the engine supports (or the comment explicitly says “see SCHEMA” with a link). Reduces wrong assumptions when editing goldens.

**Acceptance:**
- Update `index.ts` (or `operations.ts` top comment) to enumerate all registered ops or point to `types.ts` discriminated union.
