# a2a-server Duplicates - Detailed File Mapping

## 1. ACTIONS PACKAGE - Triple Nesting

### Location A: packages/actions/src/
### Location B: packages/features/src/actions/
### Location C: packages/features/src/actions/src/actions/

| File | Location A | Location B | Location C | Status |
|------|-----------|-----------|-----------|--------|
| action-executor.ts | ✓ | ✓ | ✓ | Identical |
| action-handler-registry.ts | ✓ | ✓ | ✓ | Identical |
| action-parser.ts | ✓ | ✓ | ✓ | Identical |
| action-processor.ts | ✓ | ✓ | ✓ | Identical |
| action-registry.ts | ✓ | ✓ | ✓ | Identical |
| action-service.ts | ✓ | ✓ | ✓ | Identical |
| action-validator.ts | ✓ | ✓ | ✓ | Identical |
| types.ts | ✓ | ✓ | ✓ | Identical |
| utils.ts | ✓ | ✓ | ✓ | Identical |
| index.ts (top level) | ✓ | ✓ | ✓ | Likely Identical |

### handlers subdirectory

| File | Location A | Location B | Location C | Status |
|------|-----------|-----------|-----------|--------|
| command-execution.ts | ✓ | ✓ | ✓ | Identical |
| edit-patch.ts | ✓ | ✓ | ✓ | Identical |
| file-operations.ts | ✓ | ✓ | ✓ | Identical |
| grep-search.ts | ✓ | ✓ | ✓ | Identical |
| mcp-call.ts | ✓ | ✓ | ✓ | Identical |
| phpantom.ts | ✓ | ✓ | ✓ | Identical |
| run-script.ts | ✓ | ✓ | ✓ | Identical |
| index.ts | ✓ | ✓ | ✓ | Identical |

### file-operations subdirectory

| File | Location A | Location B | Location C | Status |
|------|-----------|-----------|-----------|--------|
| file-exists.ts | ✓ | ✓ | ✓ | Identical |
| list-directory.ts | ✓ | ✓ | ✓ | Identical |
| read-file.ts | ✓ | ✓ | ✓ | Identical |
| write-file.ts | ✓ | ✓ | ✓ | Identical |
| security.ts | ✓ | ✓ | ✓ | Identical |
| types.ts | ✓ | ✓ | ✓ | Identical |

### definitions subdirectory

| File | Location A | Location B | Location C | Status |
|------|-----------|-----------|-----------|--------|
| auto-ai-index.ts | ✓ | ✓ | ✓ | Identical |

---

## 2. GRAY ROOM PACKAGE - Parallel Duplication

### Location A: packages/features/src/gray-room/
### Location B: packages/gray-room/src/

| File | Loc A | Loc B | Path | Status |
|------|-------|-------|------|--------|
| config.ts | ✓ | ✓ | root | Identical |
| config.production.ts | ✓ | ✓ | root | Identical |
| logger.ts | ✓ | ✓ | root | Identical |
| manager.ts | ✓ | ✓ | root | Identical |
| orchestrator.ts | ✓ | ✓ | root | Identical |
| types.ts | ✓ | ✓ | root | Identical |
| index.ts | ✓ | ✓ | root | Identical |

### components/context/context subdirectory

| File | Loc A | Loc B | Status |
|------|-------|-------|--------|
| AgentSwing.ts | ✓ | ✓ | Identical |
| Ultracontext.ts | ✓ | ✓ | Identical |
| context-manager.metrics.ts | ✓ | ✓ | Identical |

### components/context subdirectory

| File | Loc A | Loc B | Status |
|------|-------|-------|--------|
| context-discovery.service.ts | ✓ | ✓ | Identical |
| ultracontext.service.ts | ✓ | ✓ | Identical |

### components/memory subdirectory

| File | Loc A | Loc B | Status |
|------|-------|-------|--------|
| MuSE.ts | ✓ | ✓ | Identical |

### core/orchestrator subdirectory

| File | Loc A | Loc B | Status |
|------|-------|-------|--------|
| gray-room-orchestrator.ts | ✓ | ✓ | Identical |

### core/request-processor subdirectory

| File | Features A | Gray-Room B | Status |
|------|-----------|-----------|--------|
| gray-room-orchestrator.ts | ✓ | ✓ | TRIPLE (also in orchestrator/) |
| gray-room-trigger.ts | ✓ | ✓ | Identical |
| gray-room-utils.ts | ✓ | ✓ | Identical |

### core/request-processor/gray-room-interrupt-handlers subdirectory

| File | Loc A | Loc B | Status |
|------|-------|-------|--------|
| algorithm-invoke.ts | ✓ | ✓ | Identical |
| auto-rag-page.ts | ✓ | ✓ | Identical |
| auto-read-file.ts | ✓ | ✓ | Identical |
| base-handler.ts | ✓ | ✓ | Identical |
| clarify.ts | ✓ | ✓ | Identical |
| compress-history.ts | ✓ | ✓ | Identical |
| thinking.ts | ✓ | ✓ | Identical |

---

## 3. UTILITIES DUPLICATION - packages/utils/src/

### Root vs lib/ Subdirectory

| File | Root | lib/ | Lines | Status |
|------|------|------|-------|--------|
| validation.ts | ✓ | ✓ | 160 | **IDENTICAL** |
| logger.ts | ✓ | ✓ | ? | Identical |
| retry.ts | ✓ | ✓ | ? | Identical |
| crypto.ts | ✓ | ✓ | ? | Identical |
| errors.ts | ✓ | ✓ | ? | Identical |
| adaptive-polling.ts | ✓ | ✓ | ? | Identical |
| backoff.ts | ✓ | ✓ | ? | Identical |
| circuit-breaker.ts | ✓ | ✓ | ? | Identical |
| deep-clone-json.ts | ✓ | ✓ | ? | Identical |
| fs-access.ts | ✓ | ✓ | ? | Identical |
| metrics.ts | ✓ | ✓ | ? | Identical |
| mkdtemp-os-tmp.ts | ✓ | ✓ | ? | Identical |
| strip-markdown-json-fence.ts | ✓ | ✓ | ? | Identical |
| task-detail-analyzer.ts | ✓ | ✓ | ? | Identical |

**Recommendation:** Delete all `lib/` versions and consolidate to root

---

## 4. UTILITY DUPLICATION - Across Packages

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| artifact-store.ts | packages/utils/src/ | packages/server/src/ | Different? |
| artifact-validator.ts | packages/utils/src/ | packages/server/src/ | Different? |
| event-bus.ts | packages/utils/src/ | packages/server/src/ | Different? |
| graph-store.service.ts | packages/utils/src/ | packages/server/src/ | Different? |
| session-compaction.ts | packages/utils/src/ | packages/server/src/ | Different? |

**Recommendation:** Centralize in packages/utils and export from there

---

## 5. REQUEST PACKAGE TRIPLICATION

| File | Location 1 | Location 2 | Location 3 | Status |
|------|-----------|-----------|-----------|--------|
| request.service.ts | packages/request/src/ | packages/server/src/request/ | packages/server/src/services/ | Triple Dup |
| request-file-storage.ts | packages/request/src/ | packages/server/src/request/ | - | Duplicate |
| client-visible-context.ts | packages/request/src/ | packages/server/src/request/ | - | Duplicate |
| index.ts | packages/request/src/ | packages/server/src/request/ | - | Duplicate |

**Recommendation:** Single source in packages/request/src/, re-export from server as needed

---

## 6. REQUEST PROCESSOR DUPLICATION

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| request-processor.service.ts | packages/server/src/request-processor/ | packages/server/src/services/ | Duplicate |

**Recommendation:** Single location with unified exports

---

## 7. API REGISTRY - Structural Duplication

| Component | Old Structure | New Structure | Status |
|-----------|--------------|---------------|--------|
| health endpoint | packages/server/src/api/registry/health.ts | packages/server/src/registry/health.ts | Duplicate |
| register endpoint | packages/server/src/api/registry/register.ts | packages/server/src/registry/register.ts | Duplicate |
| route definitions | packages/server/src/api/registry/route.ts | packages/server/src/registry/route.ts | Duplicate |

**Pattern:** Migration from nested api/ structure, incomplete cleanup

---

## 8. TOOLS EVOLUTION - Split Implementations

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| tools-evolve.ts | packages/server/src/api/ | packages/server/src/ | Duplicate |
| tools-evolve-sandbox.ts | packages/server/src/api/ | packages/server/src/ | Duplicate |

---

## 9. EVALUATION/TESTING DUPLICATION

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| vision-tester.ts | packages/server/src/evaluation/ | packages/server/src/ | Duplicate |

---

## 10. MEMORY PACKAGE - Nested Duplication

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| episodic-memory.ts | packages/daemon/src/memory/ | packages/memory/src/src/ | Duplicate |
| experience-bank.ts | packages/daemon/src/memory/ | packages/memory/src/src/ | Duplicate |
| temporal-memory.ts | packages/daemon/src/memory/ | packages/memory/src/src/ | Duplicate |

**Issue:** Extra `src/src/` nesting in memory package

---

## 11. CONTROLLER DUPLICATION

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| auth.controller.ts | packages/server/src/controllers/ | packages/server/src/controllers/controllers/ | Duplicate |

**Issue:** Double-nested directory structure

---

## 12. SKILLS DUPLICATION

| File | Location 1 | Location 2 | Status |
|------|-----------|-----------|--------|
| SkillRegistry.ts | packages/features/src/actions/src/skills/ | packages/features/src/skills/ | Duplicate |
| dummy.skill.ts | packages/features/src/actions/src/skills/custom/ | packages/features/src/skills/custom/ | Duplicate |

---

## 13. TYPE DEFINITION LOCATIONS

| Package | Location | Type Files |
|---------|----------|-----------|
| actions | src/ | types.ts, handlers/file-operations/types.ts |
| features/actions | src/, src/src/actions/ | types.ts (×2), handlers/.../types.ts (×2) |
| gray-room | features/src/, standalone src/ | types.ts (×2) |
| config | root | types.ts |
| protocol | types/ | errors.ts ← should be shared |
| server | safety-layer/ | types.ts |
| transform | src/ | types.ts |

**Issue:** No unified type definitions, scattered across packages

---

## 14. ERROR/VALIDATION DEFINITIONS

| Component | Locations | Status |
|-----------|-----------|--------|
| Error types | protocol/types/, utils/lib/, utils/root | Triple definition |
| Validation schemas | utils/lib/validation.ts, utils/src/validation.ts | Duplicate |
| Config validation | config/validate.ts, transform/pipeline/validate.ts | Variant? |

---

## 15. INDEX FILES - Critical for Module Boundary Analysis

| Package | Index Locations | Potential Risk |
|---------|-----------------|-----------------|
| actions | src/, handlers/, (nested) | Circular imports? |
| features/actions | src/, handlers/, (nested) | High risk |
| features/gray-room | root, (nested) | Circular imports? |
| gray-room | standalone src/ | Parallel implementation |
| config | root, schemas/, validators/ | Boundary unclear |
| request | src/, (mirrored in server) | Import confusion |
| server | root, request/, routes/, request-processor/ | Many entry points |
| services | utils/, (mirrored in server/src/services/) | Unclear usage |
| transform | src/ | Central role |

**Recommendation:** Audit for circular dependencies, establish single entry point per package

---

## Statistical Summary

| Metric | Count |
|--------|-------|
| Total unique duplicate files by name | ~120+ |
| Files with exactly 2 copies | ~70 |
| Files with 3+ copies | ~20 |
| Complete packages duplicated | 3 (actions, gray-room, memory) |
| Cross-package service duplications | 4 major |
| API endpoint duplications | 4+ |
| Utility function duplications | 15+ |
| Index file locations | 30+ |
| Type definition locations | 11+ |

---

## Recommended Consolidation Order

### Tier 1 (Must Fix - 40% of issues)
1. Actions triple nesting
2. Gray-room package duplication
3. Utilities lib/ consolidation

### Tier 2 (Should Fix - 35% of issues)
1. Request service triplication
2. API registry duplication
3. Memory package structure

### Tier 3 (Nice to Fix - 25% of issues)
1. Type definition consolidation
2. Index file audit
3. Skills registry cleanup
4. Tools evolution consolidation

