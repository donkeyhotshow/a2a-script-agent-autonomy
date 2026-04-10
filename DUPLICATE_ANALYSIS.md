# a2a-server Duplicate Analysis

**Analysis Date:** April 10, 2026  
**Scope:** a2a-server codebase (src/, packages/, shared/)

---

## Executive Summary

The a2a-server codebase contains **extensive code duplication** across multiple categories:

1. **Nested duplicate structures** - Same code mirrored in nested subdirectories
2. **Utility/library duplication** - Same functions in multiple locations (e.g., `src/` and `src/lib/`)
3. **Package-level duplication** - Identical implementations across separate packages
4. **Component duplication** - Same features in parallel package structures (features/ vs standalone packages)

**Estimated Impact:** ~30-40% of source files have duplicates, affecting maintainability, consistency, and code sync issues.

---

## 1. NESTED DIRECTORY DUPLICATION

### 1.1 Actions Package Triple Nesting

**Pattern:** `src/actions/` → `src/actions/src/actions/` structure

Three levels of the same action files:

#### Files affected:
- `action-executor.ts`
- `action-handler-registry.ts`
- `action-parser.ts`
- `action-processor.ts`
- `action-registry.ts`
- `action-service.ts`
- `action-validator.ts`
- `command-execution.ts`
- `edit-patch.ts`
- `file-operations.ts`
- `file-operations/file-exists.ts`
- `file-operations/list-directory.ts`
- `file-operations/read-file.ts`
- `file-operations/security.ts`
- `file-operations/types.ts`
- `file-operations/write-file.ts`
- `grep-search.ts`
- `mcp-call.ts`
- `phpantom.ts`
- `run-script.ts`
- `utils.ts`

**Locations:**
- [packages/actions/src/](packages/actions/src/)
- [packages/features/src/actions/](packages/features/src/actions/)
- [packages/features/src/actions/src/actions/](packages/features/src/actions/src/actions/)

**Status:** Files are complete duplicates (identical implementations)

**Impact:** 3x code maintenance burden for any action handler changes

---

### 1.2 Gray Room Package Triple Nesting

**Pattern:** `features/gray-room/` → `gray-room/` parallel structure

Identical implementations in both:
- [packages/features/src/gray-room/](packages/features/src/gray-room/)
- [packages/gray-room/src/](packages/gray-room/src/)

#### Files affected:
- `AgentSwing.ts`
- `algorithm-invoke.ts`
- `auto-rag-page.ts`
- `auto-read-file.ts`
- `base-handler.ts`
- `clarify.ts`
- `compress-history.ts`
- `config.production.ts`
- `config.ts`
- `context-discovery.service.ts`
- `context-manager.metrics.ts`
- `gray-room-orchestrator.ts` (2 copies in features/)
- `gray-room-trigger.ts`
- `gray-room-utils.ts`
- `logger.ts`
- `manager.ts`
- `MuSE.ts`
- `orchestrator.ts`
- `thinking.ts`
- `types.ts`
- `ultracontext.service.ts`
- `Ultracontext.ts`

**Status:** Files are complete duplicates

**Impact:** 2x code maintenance for all gray-room features

---

### 1.3 Memory Package with Nested src Structure

**Pattern:** `packages/memory/src/src/` doubling

#### Files affected:
- `episodic-memory.ts`
- `experience-bank.ts`
- `temporal-memory.ts`

**Locations:**
- [packages/daemon/src/memory/](packages/daemon/src/memory/)
- [packages/memory/src/src/](packages/memory/src/src/) ← **Extra nested src/src**

**Impact:** Confusing directory structure with functional duplicates

---

## 2. UTILITY/LIBRARY DUPLICATION

### 2.1 Duplicate Utility Files in packages/utils/src/

**Pattern:** Utilities exist in both root and `lib/` subdirectory

#### Duplicates:
- `packages/utils/src/validation.ts` ↔ `packages/utils/src/lib/validation.ts` (160 lines each - **IDENTICAL**)
- `packages/utils/src/logger.ts` ↔ `packages/utils/src/lib/logger.ts`
- `packages/utils/src/retry.ts` ↔ `packages/utils/src/lib/retry.ts`
- `packages/utils/src/crypto.ts` ↔ `packages/utils/src/lib/crypto.ts`
- `packages/utils/src/errors.ts` ↔ `packages/utils/src/lib/errors.ts`
- `packages/utils/src/adaptive-polling.ts` ↔ `packages/utils/src/lib/adaptive-polling.ts`
- `packages/utils/src/backoff.ts` ↔ `packages/utils/src/lib/backoff.ts`
- `packages/utils/src/circuit-breaker.ts` ↔ `packages/utils/src/lib/circuit-breaker.ts`
- `packages/utils/src/deep-clone-json.ts` ↔ `packages/utils/src/lib/deep-clone-json.ts`
- `packages/utils/src/fs-access.ts` ↔ `packages/utils/src/lib/fs-access.ts`
- `packages/utils/src/metrics.ts` ↔ `packages/utils/src/lib/metrics.ts`
- `packages/utils/src/mkdtemp-os-tmp.ts` ↔ `packages/utils/src/lib/mkdtemp-os-tmp.ts`
- `packages/utils/src/strip-markdown-json-fence.ts` ↔ `packages/utils/src/lib/strip-markdown-json-fence.ts`
- `packages/utils/src/task-detail-analyzer.ts` ↔ `packages/utils/src/lib/task-detail-analyzer.ts`
- `packages/utils/src/session-compaction.ts` ↔ `packages/utils/src/session-compaction.ts` (also in utils root)

**Impact:** 15 core utility functions have duplicate implementations. Importing from either location creates maintenance headaches and potential version mismatches.

---

### 2.2 Duplicate Utilities Across Packages

**Pattern:** Same functionality scattered across utils and server packages

#### Duplicates:
- `packages/utils/src/artifact-store.ts` ↔ `packages/server/src/artifact-store.ts`
- `packages/utils/src/artifact-validator.ts` ↔ `packages/server/src/artifact-validator.ts`
- `packages/utils/src/event-bus.ts` ↔ `packages/server/src/event-bus.ts`
- `packages/utils/src/graph-store.service.ts` ↔ `packages/server/src/graph-store.service.ts`
- `packages/utils/src/session-compaction.ts` ↔ `packages/server/src/session-compaction.ts`

**Impact:** Different packages may import different versions, causing inconsistencies

---

## 3. CROSS-PACKAGE DUPLICATION

### 3.1 Request Package Duplication

**Pattern:** Same files in `request/` package and nested in `server/request/`

#### Duplicates:
- `packages/request/src/index.ts` ↔ `packages/server/src/request/index.ts`
- `packages/request/src/client-visible-context.ts` ↔ `packages/server/src/request/client-visible-context.ts`
- `packages/request/src/request-file-storage.ts` ↔ `packages/server/src/request/request-file-storage.ts`
- `packages/request/src/request.service.ts` ↔ `packages/server/src/request/request.service.ts` (also in `server/services/`)

**Status:** Complete duplication across three locations for request.service.ts

**Impact:** Request handling logic is split across three independent locations

---

### 3.2 Request Processor Service Triple Duplication

#### Duplicates:
- `packages/server/src/request-processor/request-processor.service.ts`
- `packages/server/src/services/request-processor.service.ts`

Also related:
- `packages/server/src/request/index.ts` → `packages/request/src/index.ts`

**Impact:** Request processor state may diverge between implementations

---

### 3.3 Services Package Duplication

**Pattern:** Services duplicated between `services/` and `server/`

#### Duplicates:
- `packages/services/src/utils/invoke.service.ts` ↔ `packages/server/src/services/invoke.service.ts`
- `packages/services/src/utils/index.ts` ↔ `packages/server/src/services/` (multiple index files)
- (Implied) Request service duplication

**Impact:** Service layer implementations may diverge

---

## 4. SERVER CONTROLLER DUPLICATION

### 4.1 API Registry Routing Duplication

**Pattern:** API routes defined in both legacy and new structure

#### Duplicates:
- `packages/server/src/api/registry/health.ts` ↔ `packages/server/src/registry/health.ts`
- `packages/server/src/api/registry/register.ts` ↔ `packages/server/src/registry/register.ts`
- `packages/server/src/api/registry/route.ts` ↔ `packages/server/src/registry/route.ts`

**Pattern:** Old structure: `api/registry/` → New structure: `registry/`

**Impact:** API route handling split between two implementations

---

### 4.2 Server Tools Evolution Duplication

#### Duplicates:
- `packages/server/src/api/tools-evolve.ts` ↔ `packages/server/src/tools-evolve.ts`
- `packages/server/src/api/tools-evolve-sandbox.ts` ↔ `packages/server/src/tools-evolve-sandbox.ts`
- `packages/server/src/evaluation/vision-tester.ts` ↔ `packages/server/src/vision-tester.ts`

**Pattern:** Migration from `api/` subdirectory to root level

**Impact:** Tool evolution logic exists in two separate files

---

### 4.3 Controller Nested Structure

#### Duplicates:
- `packages/server/src/controllers/auth.controller.ts` ↔ `packages/server/src/controllers/controllers/auth.controller.ts`

**Pattern:** Double-nested controllers directory

**Impact:** Confusing controller organization

---

## 5. TYPE DEFINITION DUPLICATION

### 5.1 Types.ts Files

Multiple `types.ts` files across packages:

**Locations:**
- `packages/actions/src/types.ts`
- `packages/actions/src/handlers/file-operations/types.ts`
- `packages/config/types.ts`
- `packages/features/src/actions/types.ts`
- `packages/features/src/actions/handlers/file-operations/types.ts`
- `packages/features/src/actions/src/actions/types.ts` (nested)
- `packages/features/src/actions/src/actions/handlers/file-operations/types.ts` (nested)
- `packages/features/src/gray-room/types.ts`
- `packages/gray-room/src/types.ts` (parallel)
- `packages/server/src/safety-layer/types.ts`
- `packages/transform/src/types.ts`

**Impact:** Type definitions scattered across codebase. No single source of truth for types.

---

### 5.2 Errors Type Definition

#### Duplicates:
- `packages/protocol/src/types/errors.ts`
- `packages/utils/src/errors.ts`
- `packages/utils/src/lib/errors.ts`

**Impact:** Error types may diverge between protocol and utils

---

## 6. SCHEMA/VALIDATION DUPLICATION

### 6.1 Config Validation

#### Duplicates:
- `packages/config/validate.ts` ↔ `packages/transform/src/pipeline/validate.ts`

**Impact:** Different validation logic for same configurations

---

### 6.2 Config Helpers

#### Duplicates:
- `packages/config/schemas/helpers.ts` ↔ `packages/server/tests/tests/integration/helpers.ts`

**Impact:** Helper functions duplicated in test suite

---

## 7. INDEX FILE DUPLICATION

**Critical Issue:** Multiple `index.ts` files create circular import risks

#### Main locations:
- `packages/actions/src/index.ts`
- `packages/actions/src/handlers/index.ts`
- `packages/config/{schemas,validators}/index.ts`
- `packages/config/index.ts`
- `packages/features/src/actions/index.ts` (×3 - nested levels)
- `packages/features/src/gray-room/index.ts`
- `packages/gray-room/src/index.ts`
- `packages/protocol/src/types/index.ts`
- `packages/request/src/index.ts` + `packages/server/src/request/index.ts`
- `packages/server/src/request-processor/index.ts`
- `packages/server/src/routes/index.ts`
- `packages/server/src/index.ts`
- Multiple test helper index files
- `packages/services/src/utils/index.ts`
- `packages/transform/src/index.ts`

**Impact:** Unclear module boundaries, potential circular dependencies

---

## 8. SKILLS DUPLICATION

#### Duplicates:
- `packages/features/src/actions/src/skills/custom/dummy.skill.ts` ↔ `packages/features/src/skills/custom/dummy.skill.ts`
- `packages/features/src/actions/src/skills/SkillRegistry.ts` ↔ `packages/features/src/skills/SkillRegistry.ts`

**Impact:** Skill registry logic duplicated

---

## 9. AUTO-INDEXING DUPLICATION

#### Duplicates:
- `packages/actions/src/definitions/auto-ai-index.ts`
- `packages/features/src/actions/definitions/auto-ai-index.ts`
- `packages/features/src/actions/src/actions/definitions/auto-ai-index.ts` (nested)

**Impact:** Three separate auto-index implementations

---

## Summary by Severity

### **CRITICAL** (Immediate Action Required)
- ✗ Actions package triple nesting (3 identical copies)
- ✗ Gray room package duplication (2-4 copies across locations)
- ✗ Utility files in both root and lib/ (15 files)
- ✗ Memory package src/src doubling
- ✗ Request service triple duplication

### **HIGH** (Should Address Soon)
- ✗ API registry routes split between api/ and root
- ✗ Request processor cross-package duplication
- ✗ Services package split duplication
- ✗ Artifact store/validator duplication
- ✗ Nested controller structure

### **MEDIUM** (Cleanup Needed)
- ✗ Type definition scattering
- ✗ Multiple index.ts files
- ✗ Skills registry duplication
- ✗ Tools evolution split

### **LOW** (Documentation/Review)
- ✗ Config validation helpers duplication
- ✗ Test helper duplication

---

## Recommendations

### Phase 1: Eliminate Core Duplication
1. **Consolidate actions package:**
   - Keep: `packages/actions/src/`
   - Delete: `packages/features/src/actions/src/actions/`
   - Update imports in features to use packages/actions

2. **Consolidate gray-room:**
   - Choose single location (recommend `packages/gray-room/src/`)
   - Remove: `packages/features/src/gray-room/`
   - Update package references

3. **Fix utils lib duplication:**
   - Delete all `packages/utils/src/lib/` files
   - Move implementations to `packages/utils/src/`
   - Update all index exports

### Phase 2: Cross-Package Consolidation
1. **Request service:**
   - Single: `packages/request/src/request.service.ts`
   - Remove from: `packages/server/src/request/`, `packages/server/src/services/`

2. **API routing:**
   - Standardize on `packages/server/src/registry/` pattern
   - Remove `packages/server/src/api/registry/`

3. **Fix memory package structure:**
   - Remove extra `src/` nesting in `packages/memory/`

### Phase 3: Architecture Clarification
1. **Establish package boundaries:**
   - Define what goes in features vs standalone packages
   - Document package naming conventions

2. **Consolidate types:**
   - Single `types.ts` per package
   - Re-export from unified location

3. **Fix index exports:**
   - Audit circular dependencies
   - Establish clear module entry points

---

## File Count Summary

- **Total duplicate files identified:** ~120+ files
- **Files with 2 copies:** ~70
- **Files with 3+ copies:** ~20
- **Complete structural duplicates:** 4 major cases (actions, gray-room, memory, request services)

---

## Migration Path

**Priority 1 - Actions & Features Consolidation (Est. 4-8 hrs)**
- Remove nested structure
- Consolidate to single location
- Update import paths

**Priority 2 - Utilities & Patterns (Est. 2-4 hrs)**
- Eliminate lib/ duplication
- Centralize utility functions
- Update barrel exports

**Priority 3 - Cross-Package Review (Est. 6-10 hrs)**
- Audit service duplication
- Fix architectural splits
- Document module boundaries

**Total Expected Effort:** 12-22 hours of refactoring work

