# RepoMapService: synchronous recursive FS + `readFileSync`

**File:** `a2a-server/src/services/context/repo-map.service.ts`

**Problem:** `readdirSync` / `statSync` walk and `readFileSync` per file block the Node event loop; large repos increase latency under load.

**Done when:** `fs.promises` + bounded concurrency or worker; or explicit “dev only” guard.
