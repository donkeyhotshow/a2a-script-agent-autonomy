# T013 — Client API JSON envelope (`success` / `data` / `session`)

**Golden:** Simulations describe **bodies**; runtime adds HTTP wrappers. [`a2a-client/packages/sdk/src/client-api-envelope.ts`](../a2a-client/packages/sdk/src/client-api-envelope.ts) unwraps multiple shapes; [`a2a-client/web/js/task-flow/tasks.js`](../a2a-client/web/js/task-flow/tasks.js) mentions Vite vs SDK vs legacy.

**Goal:** One normalization path per route family (session GET, `next`, async poll) so Web and SDK tests do not fork on envelope variants.

**Acceptance:**
- Central helper used by Vite plugin + SDK where both expose the same logical API; comment matrix: response shape → consumer.
- Add a unit test matrix for `unwrap` / equivalent.
