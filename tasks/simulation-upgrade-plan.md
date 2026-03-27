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

**Upgrade needed**: None - verified by fixture contract tests and `sim:workbench:validate`.

### 3. Task Decomposition (`task-decomposition/`)
Симуляции декомпозиции задач.

**Upgrade needed**: None - already aligned

### 4. Fix Simulations (`fix-*`)
Скриптовые операции без LLM.

**Upgrade needed**: None

### 5. Interrupt/Thinking (`interrupt-thinking/`)
Gray room симуляции для thinking/reasoning.

**Upgrade needed**: None - verified by fixture contract checks and schema-aligned goldens.

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
- [x] Update SCHEMA.md with latest simulation format examples *(added workbench sections example + practical validation commands)*
- [x] Add link to docs/SESSION-SYSTEMS-OVERVIEW.md in README.md *(added to `a2a-client/docs/README.md`)*
- [x] Update simulation README with validation commands *(added lint/validate/workbench validator commands in `simulations/README.md`)*

### Tests
- [x] Add unit tests for projection DTO generation *(added `a2a-client/tests/unit/session-projection-dto.test.mjs`, 4 tests passing)*
- [x] Add integration tests for workbench sections *(added `a2a-client/tests/unit/simulation-workbench-contract.test.mjs`, fixture-based checks passing)*
- [x] Update golden file expectations for new format *(covered by new workbench fixture contract assertions against existing goldens)*

### Code
- [x] Add debug logging to session-projection-dto.js *(safe hook behind `A2A_SESSION_DTO_DEBUG=1`)*
- [x] Add validation script for workbench format *(added `a2a-server/scripts/sim-workbench-validate.ts` + npm script)*

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
| Phase 2 | Projection DTO alignment check | Done |
| Phase 3 | Workbench format verification | Done |
| Phase 4 | Gray room trace validation | Done |
| Phase 5 | Documentation updates | Done |
| Phase 6 | Side fixes (tests, code) | Done |

---

## Related Files

- [docs/SESSION-SYSTEMS-OVERVIEW.md](../docs/SESSION-SYSTEMS-OVERVIEW.md)
- [simulations/SCHEMA.md](../simulations/SCHEMA.md)
- [simulations/CLIENT-SDK-IDEAL.md](../simulations/CLIENT-SDK-IDEAL.md)
- [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md)