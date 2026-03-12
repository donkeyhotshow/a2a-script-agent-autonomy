# Refactor Large Files - Approved Plan Implementation
Priority: session-store.js, stepRoutes.js first, then tests.

## Step 1: Refactor a2a-client/web/js/session-store.js [IN PROGRESS]
- [ ] Extract utils/normalizers.js (normalizeMessage, formatDuration etc.)
- [ ] Extract storage/SessionStorageAPI.js (create/save/load/list/check methods)
- [ ] Refactor core/SessionStoreCore.js (state, events, getters/setters)
- [ ] Update main session-store.js to compose modules
- [ ] Test: Check api-integration.js still works

## Step 2: Refactor a2a-client/vite-plugin-a2a/routes/stepRoutes.js
- [ ] Extract handlers/stepHandlers.js (GET/POST route logic)
- [ ] Extract proxy/a2aProxy.js (server polling/fetch)
- [ ] Extract utils/stepUtils.js (session loading/saving)
- [ ] Update main routes/stepRoutes.js
- [ ] Test: npm run dev, check /api/a2a/sessions

## Step 3: Refactor tests/e2e/web-ui-smoke-api.spec.ts
- [ ] Extract helpers/infra-manager.ts
- [ ] Extract helpers/smoke-logger.ts
- [ ] Split: e2e/infra.spec.ts, e2e/services.spec.ts, e2e/ui.spec.ts
- [ ] Test: npx playwright test e2e/

## Step 4: Other tests/files
- [ ] nodes.test.js → split by node type or suites
- [ ] rag-searcher.ts → extract utils
- [ ] report-formatter.ts → minor utils extract

## Step 5: Validate & PR
- [ ] Run full test suite: cd a2a-client && npm test
- [ ] Create branch blackboxai/refactor-large-files
- [ ] gh pr create

**Next: Start Step 1**

