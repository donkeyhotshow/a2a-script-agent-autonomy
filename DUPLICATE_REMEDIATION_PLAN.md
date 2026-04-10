# Duplicate Code Remediation Plan

## Overview

This document provides step-by-step instructions for eliminating ~120+ duplicate files across the a2a-server codebase.

**Estimated Effort:** 12-22 hours of refactoring  
**Risk Level:** Medium (requires careful import path updates)  
**Testing Impact:** All packages need re-export test

---

## Phase 1: Utilities Consolidation (CRITICAL - 3-5 hours)

### Goal
Eliminate duplicate utilities in `packages/utils/src/` and `packages/utils/src/lib/`

### Step 1.1: Audit Current Imports

```bash
# Find all imports from both locations
grep -r "from.*utils/src/lib/" packages/ --include="*.ts" | head -20
grep -r "from.*utils/src/" packages/ --include="*.ts" | head -20
```

**Task:** Document which files import from `lib/` vs root

### Step 1.2: Consolidate to Root

For each duplicated file:

**Example: validation.ts**

1. Verify they are identical:
   ```bash
   diff packages/utils/src/validation.ts packages/utils/src/lib/validation.ts
   ```

2. Update package.json exports to ensure validation is exported:
   ```json
   {
     "exports": {
       "./validation": "./dist/validation.js",
       "./lib/validation": "./dist/validation.js"
     }
   }
   ```

3. Create re-export in `packages/utils/src/lib/validation.ts`:
   ```typescript
   // Deprecated: Import from parent instead
   export * from '../validation.js';
   ```

4. Update files importing from lib/validation.ts:
   ```typescript
   // OLD: import { validation } from '../lib/validation.js';
   // NEW:
   import { validation } from '../validation.js';
   ```

5. After all imports updated, delete `packages/utils/src/lib/validation.ts`

### Step 1.3: Repeat for All 15 Utility Files

Priority order:
1. validation.ts
2. logger.ts
3. retry.ts
4. errors.ts
5. crypto.ts
6. circuit-breaker.ts
7. backoff.ts
8. fs-access.ts
9. metrics.ts
10. strip-markdown-json-fence.ts
11. task-detail-analyzer.ts
12. deep-clone-json.ts
13. adaptive-polling.ts
14. mkdtemp-os-tmp.ts
15. session-compaction.ts

### Step 1.4: Update Main Index

Update `packages/utils/src/index.ts`:

```typescript
// Export all from lib (for backward compatibility)
export * from './validation.js';
export * from './logger.js';
export * from './retry.js';
export * from './crypto.js';
// ... etc for all utilities

// Optional: Create lib export barrel for compatibility
export * as lib from './index.js';
```

### Step 1.5: Verify and Test

```bash
npm test -- packages/utils/src
npm run build
```

**Verification:** All imports work, no lib/ duplication remains

---

## Phase 2: Actions Package Consolidation (CRITICAL - 4-6 hours)

### Goal
Eliminate triple nesting: `src/actions/` → `features/src/actions/` → `features/src/actions/src/actions/`

### Step 2.1: Establish Single Source of Truth

**Decision:** Keep `packages/actions/src/` as primary

Rationale:
- It's the original location
- Better package isolation
- Cleaner import paths

### Step 2.2: Update packages/features Package

In `packages/features/package.json`, add re-export:

```json
{
  "exports": {
    "./actions": {
      "import": "../actions/dist/index.js",
      "types": "../actions/dist/index.d.ts"
    }
  }
}
```

### Step 2.3: Migrate Features Internal Dependencies

Find all imports within features that use actions:

```bash
grep -r "from.*features.*actions" packages/features/src --include="*.ts"
grep -r "from '\\./actions" packages/features/src --include="*.ts"
```

Update to use:
```typescript
// OLD: import { ActionExecutor } from '../actions/action-executor.js';
// NEW:
import { ActionExecutor } from '../../actions/src/action-executor.js';
// OR if features needs to re-export:
import { ActionExecutor } from '@a2a/actions';
```

### Step 2.4: Delete Nested Duplicate

Delete entire directory:
```bash
rm -rf packages/features/src/actions/src/actions/
```

But keep `packages/features/src/actions/` if it has handlers/definitions specific to features

### Step 2.5: Handle Features-Specific Actions

If `packages/features/src/actions/` has unique code:

**Analyze:**
- Which files are unique to features?
- Are they wrappers or extensions?
- Can they be merged into actions package?

**Option A: Move to Actions Package**
```bash
mv packages/features/src/actions/handlers/* packages/actions/src/handlers/
```

**Option B: Keep as Wrapper**
Rename to `packages/features/src/action-handlers/`

### Step 2.6: Update All Imports

Find all action imports:
```bash
grep -r "from '.*actions/" packages/ --include="*.ts" | grep -v node_modules | grep -v dist
```

Update patterns:
```typescript
// OLD: from '../actions/action-executor'
// NEW: from '@a2a/actions' or '@a2a/features/actions'

// OLD: from '../../features/src/actions/...'
// NEW: from '@a2a/actions' or direct path if kept
```

### Step 2.7: Test Actions Package

```bash
npm test -- packages/actions
npm test -- packages/features --grep "action"
npm run build packages/actions
```

---

## Phase 3: Gray Room Consolidation (CRITICAL - 4-6 hours)

### Goal
Consolidate: `features/gray-room/` → `gray-room/` into single package

### Step 3.1: Audit Differences

Compare the two implementations:

```bash
diff -r packages/features/src/gray-room/ packages/gray-room/src / | grep "^<\|^>" | head -30
```

Determine:
- Are they 100% identical?
- Which has more recent updates?
- Are there features in one not in the other?

### Step 3.2: Choose Primary Location

**Recommendation:** Use `packages/gray-room/src/` as primary

Reasoning:
- Standalone package is cleaner
- Less entanglement with features
- Better separation of concerns

### Step 3.3: Merge Any Unique Code

If features version has unique code:

```bash
# Copy unique files from features to gray-room
diff -r packages/features/src/gray-room/ packages/gray-room/src/ | \
  grep "^Only in.*packages/features" | \
  awk '{print $5}' | \
  xargs -I {} cp -r {} packages/gray-room/src/
```

### Step 3.4: Update Features Package

Create re-export in `packages/features/src/gray-room/index.ts`:

```typescript
// Re-export from standalone gray-room package
export * from '../../gray-room/src/index.js';
export * from '../../gray-room/src/manager.js';
// ... export specific public APIs
```

### Step 3.5: Update Internal Features Imports

```bash
grep -r "from '.*gray-room" packages/features/src --include="*.ts" | \
  grep -v "'/gray-room'" | \
  head -20
```

Change:
```typescript
// OLD: from '../gray-room/manager'
// NEW: from '../../gray-room/src/manager'
```

### Step 3.6: Delete Features Gray-Room Directory

```bash
rm -rf packages/features/src/gray-room/...jus-keep-index.ts
```

Actually keep a thin index.ts that re-exports from standalone package.

### Step 3.7: Update Gray-Room Package Exports

Ensure `packages/gray-room/package.json`:

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./manager": "./dist/manager.js",
    "./types": "./dist/types.js"
  }
}
```

### Step 3.8: Test Integration

```bash
npm test -- packages/gray-room
npm test -- packages/features --grep "gray"
npm run build
```

---

## Phase 4: Request Service Consolidation (HIGH - 2-3 hours)

### Goal
Collapse: `request/src/` → `server/request/` → `server/services/` into `request/src/`

### Step 4.1: Audit Versions

```bash
diff packages/request/src/request.service.ts packages/server/src/request/request.service.ts
diff packages/request/src/request.service.ts packages/server/src/services/request.service.ts
```

Determine which version is most up-to-date.

### Step 4.2: Establish Single Source

**Primary:** `packages/request/src/request.service.ts`

Other versions become re-exports:

```typescript
// packages/server/src/request/request.service.ts
export * from '../../request/src/request.service.js';

// packages/server/src/services/request.service.ts  
export * from '../../request/src/request.service.js';
```

### Step 4.3: Update Server Imports

```bash
grep -r "from.*server.*request" packages/ --include="*.ts" | grep -v dist
```

Change:
```typescript
// OLD: import { RequestService } from '../request/request.service';
// NEW: import { RequestService } from '@a2a/request';
```

### Step 4.4: Test

```bash
npm test -- packages/request
npm test -- packages/server --grep "request"
npm run build
```

---

## Phase 5: API Registry Cleanup (HIGH - 1-2 hours)

### Goal
Complete migration from `api/registry/` to `registry/`

### Step 5.1: Identify All Old References

```bash
grep -r "api/registry" packages/server/src --include="*.ts"
```

### Step 5.2: Update Routes

Find route registrations:
```bash
grep -r "'/registry" packages/server/src --include="*.ts" | grep -v "api/"
```

### Step 5.3: Delete Old api/registry Directory

```bash
rm -rf packages/server/src/api/registry/
```

If api/ directory is now empty, also remove:
```bash
rm -rf packages/server/src/api/ (if empty)
```

### Step 5.4: Test API

```bash
npm test -- packages/server --grep "registry|api"
```

---

## Phase 6: Memory Package Structure Fix (HIGH - 1 hour)

### Goal
Remove unnecessary `src/src/` nesting

### Step 6.1: Restructure

```bash
# Current: packages/memory/src/src/
# Target: packages/memory/src/

# Move files up one level
mv packages/memory/src/src/* packages/memory/src/
rmdir packages/memory/src/src/

# Update imports within package
sed -i 's|from.*src/src/|from ./|g' packages/memory/src/*.ts
```

### Step 6.2: Update External Imports

```bash
grep -r "from.*memory.*src/src" packages/ --include="*.ts"
```

Update:
```typescript
// OLD: from '@a2a/memory/dist/src/src/episodic-memory'
// NEW: from '@a2a/memory/dist/episodic-memory'
```

### Step 6.3: Test

```bash
npm test -- packages/memory
npm run build
```

---

## Phase 7: Type Definition Consolidation (MEDIUM - 2-3 hours)

### Goal
Establish single types.ts per package

### Step 7.1: Audit Type Locations

```bash
find packages -name "types.ts" ! -path "*/dist/*" ! -path "*/node_modules/*" | sort
```

### Step 7.2: Choose Primary Type File Per Package

| Package | Primary | Secondary | Action |
|---------|---------|-----------|--------|
| actions | `src/types.ts` | `src/handlers/*/types.ts` | Merge into main, re-export specific |
| gray-room | `src/types.ts` | (parallel copy) | Keep single copy |
| features | `src/actions/types.ts` | `src/gray-room/types.ts` | Keep as package-level |
| transform | `src/types.ts` | N/A | Keep as-is |

### Step 7.3: Consolidate Handler Types

For handler-specific types:

```typescript
// OLD: packages/actions/src/handlers/file-operations/types.ts
// Move to:
// packages/actions/src/handlers/types.ts

// OLD import pattern:
// import { ... } from '../file-operations/types';
// NEW import pattern:
// import { ... } from '../types';
```

### Step 7.4: Update Exports

Main package types.ts:
```typescript
// Re-export handler types for convenience
export * from './handlers/types.js';
export * from './handlers/file-operations/types.js';

// Or create namespace:
export namespace Handlers {
  export * from './handlers/types.js';
}
```

### Step 7.5: Update All Type Imports

```bash
# Find all type imports
grep -r "from.*types" packages/features/src/actions --include="*.ts" | head -20
```

Update:
```typescript
// OLD: import { FileOpsTypes } from '../handlers/file-operations/types'
// NEW: import { FileOpsTypes } from '../types'
```

---

## Phase 8: Index File Audit (MEDIUM - 1-2 hours)

### Goal
Clarify module boundaries & eliminate circular dependencies

### Step 8.1: Visualize Dependency Graph

For each package, create a simple graph:

```bash
# Find what each index imports
grep -h "^export\|^import" packages/actions/src/index.ts | head -20
grep -h "^export\|^import" packages/actions/src/handlers/index.ts | head -20
```

### Step 8.2: Identify Circular Dependencies

```bash
# Install and run dependency checker
npm install --save-dev depcheck

# Check for circular refs
npx depcheck packages/actions/src
```

### Step 8.3: Fix Circular Dependencies

Common pattern:
```typescript
// packages-actions/src/index.ts
import * from './handlers/index.ts';

// packages/actions/src/handlers/index.ts  
import { ActionExecutor } from '../action-executor.ts'; // Goes back up
```

Solution:
```typescript
// Remove imports from handlers/index.ts that go back to parent
// Only export what comes from this directory
export * from './command-execution.js';
export * from './grep-search.js';
```

### Step 8.4: Document Module Boundaries

Create `INDEX_STRUCTURE.md` in each package:

```markdown
# packages/actions Module Structure

## Root Index (index.ts)
Exports: ActionExecutor, ActionRegistry, ActionValidator, ...
Used by: features, server, client

## handlers/index.ts  
Exports: CommandExecution, GrepSearch, RunScript, ...
Used by: parent package, internal

## handlers/file-operations/index.ts
Exports: ReadFile, WriteFile, FileExists, ...
Used by: parent handlers, internal
```

---

## Phase 9: Service Layer Consolidation (MEDIUM - 2 hours)

### Goal
Clarify services package vs server services

### Step 9.1: Audit Current Usage

```bash
grep -r "from.*services/src" packages/ --include="*.ts" | wc -l
grep -r "from.*services/utils" packages/ --include="*.ts" | wc -l
```

### Step 9.2: Decide Pattern

**Two options:**

**Option A: Centralize in services package**
- Move all services to `packages/services/src/`
- Have server re-export from services

**Option B: Keep in server**
- Delete `packages/services/` (if external dependency allows)
- Keep services in `packages/server/src/services/`

### Step 9.3: Implement Chosen Pattern

If choosing centralization:

```bash
# Move services
mv packages/server/src/services/* packages/services/src/
rmdir packages/server/src/services/

# Create re-export
mkdir packages/server/src/services (directory only)
# Add symlink or re-export index
```

### Step 9.4: Update Imports

```bash
grep -r "from.*services" packages/server/src --include="*.ts"
```

Update:
```typescript
// OLD: from './services/request.service'
// NEW: from '@a2a/services'
```

---

## Phase 10: Validation & Testing

### Step 10.1: Build All Packages

```bash
npm run build
```

Expected: Zero errors

### Step 10.2: Run Full Test Suite

```bash
npm test
```

Expected: All tests pass

### Step 10.3: Check for Type Issues

```bash
npm run typecheck
```

Expected: No type errors

### Step 10.4: Audit Imports

```bash
grep -r "from.*lib/" packages/src --include="*.ts" | \
  grep -v "node_modules" | \
  grep -v "/dist/"
```

Expected: Empty result (all lib/ imports eliminated)

### Step 10.5: Verify No Duplicates

```bash
# Find duplicate file names again  
Get-ChildItem -Recurse packages -Include "*.ts" -Exclude "*.d.ts" | 
  Where-Object {$_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "dist"} | 
  Group-Object -Property Name | 
  Where-Object {$_.Count -gt 1} | 
  Measure-Object | 
  Select-Object -ExpandProperty Count
```

Expected: Near 0 (only expected duplicates like test helpers)

---

## Phase 11: Documentation & Communication

### Step 11.1: Update ARCHITECTURE.md

Add section: "Module Organization"

```markdown
## Module Organization

### Core Packages
- **@a2a/actions**: Action execution and handlers
- **@a2a/gray-room**: AI inference and interrupt handling
- **@a2a/transform**: Context transformation pipeline
- **@a2a/utils**: Shared utilities and helpers

### Service Packages  
- **@a2a/request**: Request handling services
- **@a2a/server**: Express server and API routes
```

### Step 11.2: Create Migration Guide

Document for developers:
```markdown
# Import Path Migration Guide

## Old vs New Imports

### Actions Package
OLD: `from '../../features/src/actions/...'`
NEW: `from '@a2a/actions'` or `from '@a2a/actions/handlers'`

### Utilities
OLD: `from '../../utils/src/lib/validation'`
NEW: `from '@a2a/utils'` or `from '@a2a/utils/validation'`
```

### Step 11.3: Create Cleanup Checklist

Maintain in `TODO.md`:
```markdown
## Duplicate Code Cleanup Checklist

### Phase 1: Utilities ✓
- [x] validation.ts
- [x] logger.ts
- [x] retry.ts
...

### Phase 2: Actions ✓
- [x] Remove nested src/actions structure
...
```

---

## Rollback Strategy

If issues arise:

1. **Commit Current State**
   ```bash
   git commit -m "Before duplicate consolidation - checkpoint"
   ```

2. **Revert if Needed**
   ```bash
   git revert <commit-hash>
   ```

3. **Incremental Rollback**
   Undo by phase in reverse order

---

## Monitoring & Validation

### Metrics to Track

| Metric | Before | Target | After |
|--------|--------|--------|-------|
| Total TS files | ~600+ | ~250-300 | ? |
| Duplicate files by name | ~120 | <10 | ? |
| Broken imports | 0 | 0 | 0 |
| Test pass rate | 95% | 100% | ? |
| Build time | X | X-15% | ? |

### Sign-offs

Before considering complete:
- [ ] Code review
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No circular imports
- [ ] Documentation updated
- [ ] Team trained on new structure

---

## Timeline Estimate

| Phase | Hours | Risk | Priority |
|-------|-------|------|----------|
| 1: Utils | 3-5 | Low | P0 |
| 2: Actions | 4-6 | Medium | P0 |
| 3: Gray-Room | 4-6 | Medium | P0 |
| 4: Request | 2-3 | Low | P1 |
| 5: API | 1-2 | Low | P1 |
| 6: Memory | 1 | Low | P2 |
| 7: Types | 2-3 | Medium | P1 |
| 8: Indexes | 1-2 | Medium | P2 |
| 9: Services | 2 | Medium | P1 |
| 10: Validation | 2-3 | Low | P0 |
| 11: Documentation | 1 | Low | P2 |
| **TOTAL** | **22-33 hrs** | **Medium** | **P0** |

---

## Success Criteria

✓ All duplicate file-by-name instances reduced to <5  
✓ No triple nesting directories remain  
✓ lib/ subdirectory consolidation complete  
✓ All tests pass without modification  
✓ No broken imports after refactor  
✓ Build succeeds without warnings  
✓ Type checking passes  
✓ Package exports are clear and documented  
✓ No circular dependencies introduced  
✓ Team trained on new structure  

---

