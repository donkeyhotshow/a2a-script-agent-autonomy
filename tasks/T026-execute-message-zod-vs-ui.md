# T026 — `execute.message`: string vs `{ content, role }`

**Golden:** [`simulations/CLIENT-SDK-IDEAL.md`](../simulations/CLIENT-SDK-IDEAL.md) — `execute.message` may be string or `{ content }` (optional `role`).

**Code:** [`action-validator.ts`](../a2a-server/src/actions/action-validator.ts) `MessageActionSchema` is `message: z.string()` only.

**Goal:** Validator matches what session-merge and Web UI already accept ([`session-transform.ts`](../a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts), [`web-session-dto.js`](../a2a-client/vite-plugin-a2a/routes/utils/web-session-dto.js)).

**Acceptance:**
- Extend `MessageActionSchema` to `z.union([z.string(), z.object({ content: z.string(), role: z.string().optional() })])` or equivalent, without breaking existing tests.
