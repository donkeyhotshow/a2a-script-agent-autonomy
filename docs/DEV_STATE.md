# DEV_STATE — Consolidated Cross-Module State

**Status:** Merged from submodules (2024). Subfiles archived to archive/docs-duplicates/.

**Primary source:** This file. See [AGENTS.md](../AGENTS.md), [GLOSSARY.md](../GLOSSARY.md).

## High-Level Summary & Iteration Log
**Doc reorganization (2024):** Duplicates merged/archived.
**Triangle Workflow:** 
| Vertex | Layer | Alert |
|--------|-------|-------|
| A | Client | Blue/Orange/Teal |
| B | Server | Gray |
| C | Proxy | Black |

**Red alert:** Run Task Monitor.

**Offline Gates:** `npm run test:before-start`, `npm run sim:lint --all`, `npm run sim:validate --all`.

## a2a-client Module State
**Role:** Session persistence, Client API (/api/a2a/*).
**Key Notes:** Async-only, router handling, storage/sessions/{id}/{step}/.
**Ports:** 5173 (Vite/Client API).
**Verify:** cd a2a-client && npm test.

[Full merged content from a2a-client/DEV_STATE.md]

## a2a-server Module State
**Role:** Stateless invoke server (/api/v1/invoke, promise polling).
**Key Notes:** Gray Room chain, action-key shapes, processors.
**Ports:** 3000.
**Verify:** cd a2a-server && npm run test && npm run sim:lint --all.

[Full merged content from a2a-server/DEV_STATE.md]

**History:** git log docs/DEV_STATE.md.


