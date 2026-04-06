# Vite plugin storage: `JSON.parse(readFileSync(...))` without guard

**Area:** `a2a-client/packages/vite-plugin/storage/*.js`, related routes (e.g. `newSessions.js`, `kv.js`, `projectSessions.js`, `sessionRoutes.js`)

**Problem:** Corrupt or partial JSON on disk throws uncaught in request handlers → 500 / hard failure; no recovery path.

**Done when:** try/catch with logged error + stable HTTP error; optional backup/repair for index files.
