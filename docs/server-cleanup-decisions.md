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
- [ ] **KEEP** - Integrate with RAG for smart file selection in coder/coder-smart simulations
- [ ] **REMOVE** - Archive and delete (save ~21k lines)
- [ ] **REFACTOR** - Extract useful parts into smaller services

**Decision:** _______________
**Reason:** _______________

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
- [ ] **KEEP** - Use for task-decomposition simulation workflow
- [ ] **REMOVE** - Delete if task-decomposition uses different approach
- [ ] **MERGE** - Integrate into Context Manager

**Decision:** _______________
**Reason:** _______________

---

### 3. framework-extractor.service.ts (~9,000 lines)
**Current State:**
- Location: `src/services/framework-extractor.service.ts`
- Purpose: Auto-detection of project frameworks (Vue, Laravel, etc.)
- Simulations Usage: NONE
- Note: Could enhance RAG initialization

**Options:**
- [ ] **KEEP** - Integrate with RAG service for context initialization
- [ ] **REMOVE** - Archive and delete
- [ ] **REFACTOR** - Simplify to basic detector

**Decision:** _______________
**Reason:** _______________

---

### 4. graph-store.service.ts (~7,000 lines)
**Current State:**
- Location: `src/services/graph-store.service.ts`
- Purpose: Entity relationships storage
- Simulations Usage: NONE

**Options:**
- [ ] **KEEP** - Use for advanced code analysis features
- [ ] **REMOVE** - Not needed for current simulations
- [ ] **ARCHIVE** - Move to separate package for future use

**Decision:** _______________
**Reason:** _______________

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
- [ ] **REMOVE LINT** - Keep only task-analysis neurons (delete 5 lint neurons)
- [ ] **ARCHIVE ALL** - Move to separate package

**Decision:** _______________
**Specific Actions:** _______________

---

## 🟢 LOW IMPACT (Stubs/Small)

### 6. ai-session-context.service.ts (~600 lines)
**State:** Functionality moved to ContextManager
**Recommendation:** REMOVE
**Decision:** [ ] Approve removal

### 7. action-scripts.service.ts (~700 lines)  
**State:** Stub, real functionality in ActionRegistry
**Recommendation:** REMOVE
**Decision:** [ ] Approve removal

### 8. migration-action.service.ts (~600 lines)
**State:** Legacy stub
**Recommendation:** REMOVE  
**Decision:** [ ] Approve removal

### 9. index-query.service.ts (~700 lines)
**State:** Possibly legacy from RAG
**Recommendation:** REVIEW - Check if used by RAG
**Decision:** [ ] Keep [ ] Remove

---

## Implementation Plan

After decisions are made:

1. **Mark for Removal** - Add @deprecated comments
2. **Archive Code** - Move to `src/archive/` or separate repo
3. **Update Dependencies** - Remove imports from other files
4. **Run Tests** - Ensure nothing breaks
5. **Update Documentation** - Remove references from docs

## Summary Table

| System | Decision | Action | Effort |
|--------|----------|--------|--------|
| entity-recognizer | ? | ? | High |
| phase-machine | ? | ? | Medium |
| framework-extractor | ? | ? | Medium |
| graph-store | ? | ? | Medium |
| neurons | ? | ? | Medium |
| ai-session-context | Remove | Delete | Low |
| action-scripts | Remove | Delete | Low |
| migration-action | Remove | Delete | Low |
| index-query | ? | Review | Low |
