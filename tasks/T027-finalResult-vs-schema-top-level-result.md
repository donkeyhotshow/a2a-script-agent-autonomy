# T027 — `finalResult` on execute vs SCHEMA “top-level `result`”

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Response — optional top-level `result` on **final** step for completion metadata.

**Code:** [`form-request-processor.ts`](../a2a-server/src/services/core/request-processor/form-request-processor.ts) emits `finalResult` inside the object passed to clients; Web [`render.js`](../a2a-client/web/js/task-flow/render.js) reads `execute.finalResult`. [`session-transform.ts`](../a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts) persists `finalResult` from `serverResponse`.

**Goal:** One documented contract: either map `finalResult` ↔ top-level `result` in the API layer, or document why the product uses **`execute.finalResult`** (and optionally align SCHEMA wording).

**Acceptance:**
- Short ADR or SCHEMA footnote; no silent duplication of the same data in two shapes on the wire.
