# T001 — Web execute DTO parity (Vite vs SDK)

**Golden:** [`simulations/CLIENT-SDK-IDEAL.md`](../simulations/CLIENT-SDK-IDEAL.md) (Web execute DTO table).

**Code:**
- `a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js`
- `a2a-client/packages/sdk/src/server/lib/web-execute-dto.ts`

**Goal:** One behavioral contract. Any change to `INTERNAL_CLIENT_ACTION_KEYS`, default messages, or `attachments` mapping must land in **both** files in the same PR.

**Acceptance:**
- Diff the two implementations after edits; attachment fields and strip order match.
- Optional: tiny shared module or codegen comment block listing the canonical key list (avoid drift).

**Out of scope:** Changing what simulations require (that is T002 + goldens).
