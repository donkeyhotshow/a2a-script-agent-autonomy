# T018 — `GET /requests/:promiseId/result` context whitelist vs SCHEMA

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Context fields — `workbench`, `files`, `scratchpad`, `scratchpad_ops` are part of the contract.

**Code:** [`a2a-server/src/routes/requests.routes.ts`](../a2a-server/src/routes/requests.routes.ts) `filterResponse()` keeps only `context.task`, `context.execution`, `context.history` (plus full `execute`). Pollers lose **`workbench`**, **`files`**, **`scratchpad`**, etc.

**Goal:** Poll path returns the same canonical context shape as the Client API session merge / goldens, or documents an explicit **narrow poll contract** and provides another way to get full context (e.g. Client API only).

**Acceptance:**
- Decide: extend whitelist, or `?includeContext=1`-style flag, or document “poll is minimal; use Client API for full state.”
- Add test: completed invoke result includes fields required for one reference sim step (e.g. agent mode with `workbench`).
