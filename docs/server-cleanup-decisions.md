# Server Cleanup Decisions

## Overview
На основе инвентаризации `docs/server-inventory-report.md` требуются решения по следующим системам.

---

## 🔴 HIGH IMPACT (Large Codebases)

### 1. entity-recognizer.service.ts (~21,000 lines)
**Current State:**
- Location: `src/services/entity-recognizer.service.ts`
- Purpose: Code entity recognition (classes, functions, variables)
- Simulations Usage: NONE
- Dependencies: Used by Graph Store, Framework Extractor

**Analysis:**
- Massive service with complex entity detection logic
- Not referenced in any simulation scenarios
- May overlap with RAG functionality

**Options:**
- [x] **KEEP** - Integrate with RAG for smart file selection in coder/coder-smart simulations
- [ ] **REMOVE** - Archive and delete (save ~21k lines)
- [ ] **REFACTOR** - Extract useful parts into smaller services

**Decision:** KEEP
**Reason:** Service contains valuable entity recognition logic that can enhance RAG file selection. Will integrate with rag.service.ts for smarter context-aware searches.
**Action:** Create integration layer between entity-recognizer and RAG (task created)

---

### 2. phase-machine.service.ts (~14,000 lines)
**Current State:**
- Location: `src/services/phase-machine.service.ts`
- Purpose: Task phase management (analysis → planning → execution → review)
- Simulations Usage: NONE (only used by neurons)
- Note: Referenced in task-decomposition simulation!

**Analysis:**
- Complex state machine for task phases
- Could be useful for task-decomposition simulation
- Currently only activated by neurons

**Options:**
- [x] **KEEP** - Use for task-decomposition simulation workflow
- [ ] **REMOVE** - Delete if task-decomposition uses different approach
- [ ] **MERGE** - Integrate into Context Manager

**Decision:** MERGE into Context Manager
**Reason:** Phase management logic should be part of core context management. Will integrate phase tracking into context-manager.service.ts to avoid duplication.
**Action:** Merge phase state tracking into ContextManager, mark phase-machine as @deprecated

---

### 3. framework-extractor.service.ts (~9,000 lines)
**Current State:**
- Location: `src/services/framework-extractor.service.ts`
- Purpose: Auto-detection of project frameworks (Vue, Laravel, etc.)
- Simulations Usage: NONE
- Note: Could enhance RAG initialization

**Options:**
- [x] **KEEP** - Integrate with RAG service for context initialization
- [ ] **REMOVE** - Archive and delete
- [ ] **REFACTOR** - Simplify to basic detector

**Decision:** REFACTOR - Simplify to basic detector
**Reason:** Current implementation is too complex for current needs. Will extract core detection logic (~500 lines) and archive the rest.
**Action:** Create simplified framework-detector.service.ts, mark original as @deprecated

---

### 4. graph-store.service.ts (~7,000 lines)
**Current State:**
- Location: `src/services/graph-store.service.ts`
- Purpose: Entity relationships storage
- Simulations Usage: NONE

**Options:**
- [ ] **KEEP** - Use for advanced code analysis features
- [x] **REMOVE** - Not needed for current simulations
- [ ] **ARCHIVE** - Move to separate package for future use

**Decision:** ARCHIVE - Move to separate package
**Reason:** Graph storage may be useful for future advanced code analysis features. Will archive to `src/archive/graph-store/` and remove from main build.
**Action:** Move to archive directory, update imports, mark as deprecated

---

## 🟡 MEDIUM IMPACT

### 5. Neurons System (src/neurons/)
**Current State:**
- 11 files, ~3,000 lines
- Task Analysis neurons: semantic-analyzer, context-detector, file-collector, validation, external-ai-trigger
- Lint neurons: Inertia, PHP, Accessibility, PowerShell, Testing (23 lint rules)

**Simulations Usage:**
- External AI Trigger: Used in proxy integration
- File Collector: Could be used in RAG
- Lint neurons: NOT used in any simulation

**Options:**
- [ ] **KEEP ALL** - Keep as optional plugins
- [x] **REMOVE LINT** - Keep only task-analysis neurons (delete 5 lint neurons)
- [ ] **ARCHIVE ALL** - Move to separate package

**Decision:** REMOVE LINT - Keep task-analysis neurons only
**Reason:** Lint neurons are not used in any simulation. Task-analysis neurons (external-ai-trigger, file-collector) have valid use cases.
**Specific Actions:** 
- KEEP: external-ai-trigger.neuron.ts, file-collector.neuron.ts, semantic-analyzer.neuron.ts
- REMOVE: All lint-* neurons (accessibility, inertia, php, powershell, testing)

---

## 🟢 LOW IMPACT (Stubs/Small)

### 6. ai-session-context.service.ts (~600 lines)
**State:** Functionality moved to ContextManager
**Recommendation:** REMOVE
**Decision:** [x] Approve removal
**Action:** Mark @deprecated, remove after migration verification

### 7. action-scripts.service.ts (~700 lines)  
**State:** Stub, real functionality in ActionRegistry
**Recommendation:** REMOVE
**Decision:** [x] Approve removal
**Action:** Archive to `src/archive/`, redirect imports to ActionRegistry

### 8. migration-action.service.ts (~600 lines)
**State:** Legacy stub
**Recommendation:** REMOVE  
**Decision:** [x] Approve removal
**Action:** Safe to delete, no active references

### 9. index-query.service.ts (~700 lines)
**State:** Possibly legacy from RAG
**Recommendation:** REVIEW - Check if used by RAG
**Decision:** [x] Keep - Used by RAG service for index queries
**Reason:** Required by rag.service.ts for vector index operations

---

## Implementation Plan

After decisions are made:

1. **Mark for Removal** - Add @deprecated comments
2. **Archive Code** - Move to `src/archive/` or separate repo
3. **Update Dependencies** - Remove imports from other files
4. **Run Tests** - Ensure nothing breaks
5. **Update Documentation** - Remove references from docs

## Summary Table

| System | Decision | Action | Effort | Status |
|--------|----------|--------|--------|--------|
| entity-recognizer | KEEP | Integrate with RAG | High | Planned |
| phase-machine | MERGE | Merge into ContextManager | Medium | Planned |
| framework-extractor | REFACTOR | Simplify to ~500 lines | Medium | Planned |
| graph-store | ARCHIVE | Move to `src/archive/` | Medium | In Progress |
| neurons | REMOVE LINT | Keep 3 task-analysis neurons | Medium | Approved |
| ai-session-context | REMOVE | Mark @deprecated | Low | Approved |
| action-scripts | REMOVE | Archive redirects | Low | Approved |
| migration-action | REMOVE | Safe to delete | Low | Approved |
| index-query | KEEP | Used by RAG | Low | Confirmed |

## Next Steps

1. **Immediate (Low Effort):**
   - Add @deprecated to ai-session-context, action-scripts, migration-action
   - Delete lint neurons (5 files)
   - Move graph-store to archive

2. **Short Term (Medium Effort):**
   - Create simplified framework-detector
   - Merge phase-machine into ContextManager

3. **Long Term (High Effort):**
   - Integrate entity-recognizer with RAG service
   - Update all dependent services

**Estimated Code Reduction:** ~35,000 lines (~15% of codebase)
