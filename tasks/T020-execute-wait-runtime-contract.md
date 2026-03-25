# T020 — `execute.wait` (runtime-only) vs golden sync pipeline

**Golden:** Sync step files do not model `promiseId` / long polling; [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) scope.

**Code:** [`a2a-client/web/js/session-data.js`](../a2a-client/web/js/session-data.js) handles `execute.wait` and coordinates with loader / emitter.

**Goal:** Treat `execute.wait` as a **runtime extension** to the protocol: document how it interacts with [`LOADER-BEHAVIOR.md`](../a2a-client/docs/LOADER-BEHAVIOR.md) and why it does not appear in `response.json` goldens.

**Acceptance:**
- Cross-link from `LOADER-BEHAVIOR.md` or `SCHEMA.md` “Scope” section (one paragraph).
