# packages/web: twin `js/` trees (drift risk)

**Paths:** `a2a-client/packages/web/js/` and `a2a-client/packages/web/web/js/` — same names: `action-executor.js`, `client-action-runner.js`, `app/event-handlers.js`, `task-flow/*.js`, etc.

**Problem:** Fixes or security changes must be applied twice; trees can diverge silently.

**Done when:** Single source (build copy, symlink, or one folder + Vite public mapping) and docs updated.
