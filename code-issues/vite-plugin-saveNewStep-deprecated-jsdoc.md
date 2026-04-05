# `saveNewStep`: `@deprecated` JSDoc vs active use

**File:** `a2a-client/packages/vite-plugin/storage/newSessions.js` (~lines 340–345)

**Problem:** `saveNewStep` is marked `@deprecated` (“use step-based storage”) but remains the central writer for step dirs and is called throughout the plugin — confusing for contributors and noisy for API consumers.

**Done when:** Remove incorrect tag, or replace with accurate note (e.g. “prefer X for Y”) and track real removal in `tasks/`.
