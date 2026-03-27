# Simulation Upgrade Plan for Client Enhancement

## Overview
План апгрейда симуляций для соответствия улучшенной структуре клиента и документации.

## Current Status
- **89 симуляций** валидны ✓
- **0 errors** в lint/validate
- **Warnings**: Optional files not found (expected)

## Categories of Simulations

### 1. Dialog Simulations (`dialog/`)
Базовые диалоговые симуляции с формой выбора режима.

| Step | Type | Notes |
|------|------|-------|
| 1 | form (router choices) | received.json uses projection DTO |
| 2+ | message exchange | response.json uses canonical format |

**Upgrade**: None needed - already aligned with projection DTO

### 2. Agent Simulations (`agent-*`)
Agent mode симуляции с workbench системой.

#### `agent-auto-ai/`
- Steps 1-7: Basic agent flow
- Gray room: 3-sub-1, 4-sub-1, 5-sub-1, 6-sub-1, 6-sub-2

#### `agent-coder/`, `agent-coder-smart/`
- Agent mode with code tools

#### `agent-analyze/`
- Agent mode for code analysis

**Upgrade needed**: 
- Verify workbench.sections in response.json matches new format
- Ensure interruptTrace visible in context.workbench.slots

### 3. Task Decomposition (`task-decomposition/`)
Симуляции декомпозиции задач.

**Upgrade needed**: None - already aligned

### 4. Fix Simulations (`fix-*`)
Скриптовые операции без LLM.

**Upgrade needed**: None

### 5. Interrupt/Thinking (`interrupt-thinking/`)
Gray room симуляции для thinking/reasoning.

**Upgrade needed**:
- Ensure interruptTrace present in context
- Verify workbench.slots.thinking populated

---

## Upgrade Tasks

### Priority 1: Projection DTO Alignment
Проверить что все `received.json` используют projection DTO (web execute DTO).

```bash
# Check received.json for client-only action keys
rg -n '"execute":\s*\{[^}]*"(form|script|read-file|rag-search)"' -g '**/received.json' simulations
```

**Expected**: No client-only keys under `execute` in received.json

### Priority 2: Workbench Sections Format
Проверить формат workbench.sections в agent симуляциях.

```bash
# Check workbench sections
rg -n 'workbench' -g '**/response.json' simulations | head -30
```

**Expected**: 
- `context.workbench.sections` present in agent-*/ responses
- Named sections (code, files, analysis, etc.)

### Priority 3: Gray Room Trace
Проверить interruptTrace в gray room симуляциях.

```bash
# Check for interruptTrace
rg -n 'interruptTrace' -g '**/response.json' simulations
```

**Expected**: Present in 6-sub-*/ response.json

### Priority 4: Documentation Update
- Update SCHEMA.md with new simulation examples
- Add reference to SESSION-SYSTEMS-OVERVIEW.md

---

## Side Fixes Needed

### Documentation
- [ ] Update SCHEMA.md with latest simulation format examples
- [ ] Add link to docs/SESSION-SYSTEMS-OVERVIEW.md in README.md
- [ ] Update simulation README with validation commands

### Tests
- [ ] Add unit tests for projection DTO generation
- [ ] Add integration tests for workbench sections
- [ ] Update golden file expectations for new format

### Code
- [ ] Add debug logging to session-projection-dto.js
- [ ] Add validation script for workbench format

---

## Validation Commands

```bash
# Lint all simulations
npm run sim:lint -- --all

# Validate all simulations  
npm run sim:validate -- --all

# Check for deprecated execute types
rg -n 'error-recovery' -g '*.json' simulations

# Check received.json for client-only keys
rg -n '"execute":\s*\{[^}]*"(form|script|read-file|rag-search)"' -g '**/received.json' simulations
```

---

## Timeline

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 | Analysis of current simulations | Done |
| Phase 2 | Projection DTO alignment check | Next |
| Phase 3 | Workbench format verification | Pending |
| Phase 4 | Gray room trace validation | Pending |
| Phase 5 | Documentation updates | Pending |
| Phase 6 | Side fixes (tests, code) | Pending |

---

## Related Files

- [docs/SESSION-SYSTEMS-OVERVIEW.md](../docs/SESSION-SYSTEMS-OVERVIEW.md)
- [simulations/SCHEMA.md](../simulations/SCHEMA.md)
- [simulations/CLIENT-SDK-IDEAL.md](../simulations/CLIENT-SDK-IDEAL.md)
- [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md)