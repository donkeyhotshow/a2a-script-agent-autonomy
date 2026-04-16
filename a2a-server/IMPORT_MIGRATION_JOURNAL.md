# Server Import Migration — Technical Report

**Date:** 2026-04-13  
**Status:** Wave 1 Complete

---

## Summary

First migration wave completed. Server files migrated from deep relative imports (`../../../lib/*`, `../../transform/src/*`) to package imports (`@a2a/server-*`).

---

## Package Map

```
                        ┌─────────────────────┐
                        │   @a2a/server       │
                        │   (packages/server) │
                        └──────────┬──────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐        ┌─────────────────┐        ┌──────────────────┐
│ @a2a/server-  │        │ @a2a/server-    │        │ @a2a/server-     │
│ transform     │◄──────►│ gray-room       │◄──────►│ llm               │
│ (resolved)    │        │ (partial)       │        │ (resolved)        │
└───────────────┘        └────────┬────────┘        └──────────────────┘
                                  │
                         ┌────────▼────────┐
                         │ @a2a/server-    │
                         │ actions         │
                         │ (resolved)      │
                         └─────────────────┘
```

---

## Build Status

| Package | Status | Notes |
|---------|--------|-------|
| `@a2a/server-transform` | ✅ Resolved | Exports used correctly |
| `@a2a/server-llm` | ✅ Resolved | Exports used correctly |
| `@a2a/server-actions` | ✅ Resolved | Exports used correctly |
| `@a2a/server-gray-room` | ⚠️ Partial | Missing public API exports |
| `@a2a/server-utils` | ✅ Resolved | Re-exports AI Hub utilities |
| `config-legacy` | ❌ Pending | Deep import issues remain |
| `server-protocol-legacy` | ❌ Pending | Deprecated, needs review |

---

## Import Canon

Two fundamental rules govern all import paths in this codebase:

| Canon | Rule | Rationale |
|-------|------|-----------|
| **C1** | Use `.js` extension for path aliases | NodeNext module resolution in `tsconfig.json` requires explicit `.js` extensions for aliased imports (`@/services/x.js` not `@/services/x`) |
| **C2** | Use package imports over relative | Eliminates fragile relative paths when files move; enables static analysis and refactoring tools |

---

## Change Table

### `@a2a/server-llm` (packages/llm/src/rag/)

| File | Action | Before | After |
|------|--------|--------|-------|
| `progressive-retriever.ts` | 🔧 fix | `../../../transform/src/types.js` | `@a2a/server-transform` |
| `auto-rag-page-server.ts` | 🔧 fix | `../../../transform/src/types.js` | `@a2a/server-transform` |

### `@a2a/server-gray-room` (packages/gray-room/src/core/)

| File | Action | Before | After |
|------|--------|--------|-------|
| `orchestrator/gray-room-orchestrator.ts` | 🔧 fix | Deep relative imports | `@a2a/server-transform`, `@a2a/server-actions`, `@a2a/server-llm` |
| `request-processor/gray-room-interrupt-handlers/auto-read-file.ts` | 🔧 fix | `../../../../actions/src/handlers/file-operations.js` | `@a2a/server-actions` |
| `request-processor/gray-room-interrupt-handlers/auto-rag-page.ts` | 🔧 fix | `../../../../llm/src/rag/progressive-retriever.js` | `@a2a/server-llm` |
| `request-processor/gray-room-interrupt-handlers/thinking.ts` | 🔧 fix | Deep relative imports | Package imports |
| `tests/gray-room-slot.test.ts` | 🔧 fix | Test imports | Updated to package imports |

### `@a2a/server` (packages/server/src/)

| File | Action | Before | After |
|------|--------|--------|-------|
| `request-processor/response-path.ts` | 🔧 fix | Deep relative | Package imports |
| `request-processor/simulation-request-processor.ts` | 🔧 fix | Deep relative | Package imports |
| `request/client-visible-context.ts` | 🔧 fix | Deep relative | Package imports |
| `tools-evolve.ts` | 🔧 fix | Deep relative | Package imports |
| `evaluation/vision-tester.ts` | 🔧 fix | Deep relative | Package imports |
| `evaluation/llm-judge.ts` | 🔧 fix | Deep relative | Package imports |
| `evaluation/design-reasoner.ts` | 🔧 fix | Deep relative | Package imports |
| `request/request.service.ts` | 🔧 fix | Deep relative | Package imports |
| `safety-layer.ts` | 🔧 fix | Deep relative | Package imports |

### Package Exports Added

| Package | File | Added Export |
|---------|------|--------------|
| `@a2a/server-llm` | `packages/llm/src/index.ts` | ➕ add `resolveAiHubBaseUrl`, `resolveAiHubBaseUrlWithModuleEnv`, `DEFAULT_AI_HUB_URL`, `fetchAiHubChatJson` |
| `@a2a/server-daemon` | `packages/daemon/package.json` | ➕ add `"type": "module"` for NodeNext compatibility |

---

## Known Issues

1. **Circular dependencies** — Cross-package deps in gray-room orchestrator require review
2. **Missing exports** — `@a2a/server-gray-room` public API needs additional exports
3. **Deprecated packages** — `config-legacy`, `server-protocol-legacy` still have deep imports

---

## Next Steps

1. Fix remaining `config-legacy` import issues
2. Resolve circular dependencies in gray-room orchestrator
3. Add missing exports to `@a2a/server-gray-room` public API
4. Run full typecheck across all packages
