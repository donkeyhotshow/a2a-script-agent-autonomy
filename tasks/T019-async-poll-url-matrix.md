# T019 — Async polling: three different URL families

**Golden:** Simulations exclude promise/async plumbing ([`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Scope).

**Runtime (today):**
- **A2A Server:** `GET /api/v1/requests/:promiseId/result` (and `/status`).
- **Vite Client API / Web:** `GET .../sessions/:id/async` ([`stepRoutes.js`](../a2a-client/vite-plugin-a2a/routes/stepRoutes.js)), hides `promiseId` from Web DTO ([`web-session-dto.js`](../a2a-client/vite-plugin-a2a/routes/utils/web-session-dto.js)).
- **SDK `AsyncClient`:** `GET /async/status/:promiseId` etc. ([`async-client.ts`](../a2a-client/packages/sdk/src/async-client.ts)) — **not** the same path as Vite.

**Goal:** One short matrix doc (comment in `WEB_UI_PROTOCOL.md` or `async-client.ts`): which binary uses which base URL + route; what ADR-0028 already implies.

**Acceptance:**
- No behavior change required in this task if everything is intentional; **misrouting** bugs get fixed in follow-ups.
