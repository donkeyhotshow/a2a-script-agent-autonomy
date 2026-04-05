# DEV_STATE - a2a-client (2026-04-03)

**2026-04-06:** `@a2a/rag` Vitest: protocol-integration, protocol-rag-search edges, hybrid RRF golden, `src/searcher/output-shaping.test.ts`, `src/suggestions.test.ts`. `vitest.config.ts` block comment must not contain `*/` inside globs. `npm run test:jest` for functional/metrics suites.

Stack готов, задач нет.

**2026-04-03 (a2a-client-web-scoped-package):** Implemented phases 2, 4, 5, 6 of @a2a-client web package scoping:
- **Phase 2:** Updated `packages/web/package.json` with proper `name`, `version`, `type`, `files`, `exports`, and `scripts`. Added build configuration using Vite lib mode via `vite.config.prod.ts`. Added basic test and lint configurations.
- **Phase 4:** Verified workspaces configuration in root `package.json` already includes `packages/*` and `shared`, covering both `@a2a-client/web` and `@a2a-client/vite-plugin`. Root scripts remain unchanged as they properly delegate to workspace packages.
- **Phase 5:** Added basic test files (`packages/web/js/tests/basic.test.js` and `packages/vite-plugin/js/tests/basic.test.js`). Confirmed Vitest configuration includes these paths. Added ESLint config for web package.
- **Phase 6:** Confirmed npm scope `@a2a-client` is used consistently. Both packages have `private: true` appropriate for monorepo development. `files` arrays are properly scoped to avoid publishing unintended files (e.g., no `storage/` or secrets). Versioning approach to be documented upon first publish.

**2026-04-03 (async → form):** After `GET …/async` completes, `action-executor` clears `promisePending` and applies poll `execute` before `GET …/sessions` hydrates; async completion sets persisted `session.status` to `active` when a follow-up `execute` exists; `saveNewSession` passes `execute` into `saveSessionIndex` so index `status` stays `active`; `deriveSessionStage` maps agent + task `form.input` to `dialog-input`; `getActiveAsyncWork` index fallback treats any step `execute` as terminal (not only `form.choices`). **Re-hydrate:** `promiseResolved` now `await`s `pullSessionSnapshot` and re-applies poll `execute` so a lagging `GET …/sessions` cannot leave the UI on a stale form.

**2026-04-03:** Dialog/loader — `session-data.setExecute` stops the session loader for any terminal `execute` without `wait` (not only actionable forms), so message-only replies unblock the panel. `action-executor.submit` sync path clears `promisePending`, treats missing `accepted` as OK, and calls `stopLoader` except when hydrated `execute.wait` is set.

**2026-04-03 (S18):** Web shell **`packages/web`** (`@a2a-client/web`: `files`/`exports`/`build`). **`@a2a-client/vite-plugin`**: physical tree **`packages/vite-plugin/`** (`index.js` entry; was `vite-plugin-a2a/` + root `vite-plugin-a2a.js`). **S18b:** Plugin must not use `../packages/execution` or `../shared` relatives (breaks when resolved via `node_modules/@a2a-client/vite-plugin`). Use **`@a2a/execution`** + **`@a2a-client/shared`** (`shared/package.json`, workspace `shared`). Root depends on **`file:packages/vite-plugin`**. **`resolveId`** maps HTML `/shared/*` to repo `shared/`; `/shared` middleware runs first in dev.

**2026-04-03 (session `/next`):** `step-routes-dialog-flow.js` sends `sync: true` on the first task beat (`execution.action === task`, `step === new`, user message) so `/invoke` returns router `execute` immediately; overwrites `context.task` with the latest submit (no stale task). Pairs with server `DEFAULT_SYNC_MODE` support.

---

## AI-Integration Work Lock
- Status: UNBLOCKED

---

## Pre-existing Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Test failures: 0 failed | Fixed | Resolved import path issues in packages/rag/tests/rag.test.js |

---

## Architecture

Client API - хранит сессии и управляет состоянием:
- Step-based storage (нумерованные папки)
- Vite plugin для `/api/a2a/*` endpoints

---

## Ports

| Порт | Компонент |
|------|-----------|
| 5173 | Vite Dev Server + Web UI |
| 3001 | Standalone Client API (опционально) |