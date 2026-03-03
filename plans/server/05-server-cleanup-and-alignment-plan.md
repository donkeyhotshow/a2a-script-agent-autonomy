# Server Cleanup and Alignment Plan

## Executive Summary
План анализа серверного кода на соответствие сценариям из simulations/ с целью:
- Выявления ненужного кода
- Определения обязательных систем
- Планирования новых компонентов

## Phase 1: Simulation Analysis

### 1.1 Active Simulation Coverage Matrix
| Simulation | Actions Used | Status | Server Support |
|------------|-------------|--------|----------------|
| analyze | rag-search, read-file, write-file | ✅ | ? |
| auto-ai | form, rag-search, list-directory, read-file, write-file, grep-search, execute-command | ✅ | ? |
| coder | message, rag-search, read-file, write-file | ✅ | ? |
| coder-smart | capture-task, rag-clarify, rag-research-plan, checklist, write-doc, execute-item | ✅ | ? |
| dialog | form, message | ✅ | ? |
| fix-vue-imports | script (vue-import-detect, resolve, apply, cleanup) | ✅ | ? |
| fix-vue-imports-batched | script (request-files, search-exporter, cleanup) | ✅ | ? |
| phpunit-deprecations | script (scan-phpunit, detect-deprecations, generate-report) | ✅ | ? |
| task-decomposition | capture-task, decompose-subtasks, decompose-steps, decompose-actions, write-doc, execute-action | ✅ | ? |

### 1.2 Action Usage Frequency
**Critical (used in 5+ simulations):**
- form
- rag-search
- read-file
- write-file
- script

**Important (used in 2-4 simulations):**
- execute-command
- message

**Optional (used in 1 simulation):**
- list-directory
- grep-search

**Missing in server (need implementation):**
- capture-task
- rag-clarify
- rag-research-plan
- checklist
- write-doc
- execute-item
- decompose-subtasks
- decompose-steps
- decompose-actions
- execute-action

## Phase 2: Server Code Inventory

### 2.1 Core Systems (Required)
Системы которые ТОЧНО нужны по симуляциям:

1. **Form Handler** (`src/actions/handlers/form-handler.ts`)
   - Status: [ ] Check exists
   - Used by: ALL simulations
   - Critical: YES

2. **RAG Search** (`src/services/rag-service.ts`)
   - Status: [ ] Check exists
   - Used by: analyze, auto-ai, coder, coder-smart, fix-vue-imports-batched
   - Critical: YES

3. **File Operations** (`src/services/file-service.ts`)
   - read-file: [ ] Check exists
   - write-file: [ ] Check exists
   - Used by: analyze, auto-ai, coder, coder-smart, task-decomposition
   - Critical: YES

4. **Command Execution** (`src/services/command-service.ts`)
   - Status: [ ] Check exists
   - Used by: auto-ai, fix-vue-imports
   - Critical: MEDIUM

5. **Script Engine** (`src/services/script-engine.ts`)
   - Status: [ ] Check exists
   - Used by: fix-vue-imports, fix-vue-imports-batched, phpunit-deprecations
   - Critical: HIGH

6. **Message Display** (`src/actions/handlers/message-handler.ts`)
   - Status: [ ] Check exists
   - Used by: dialog
   - Critical: LOW

### 2.2 Potentially Unused Systems
Системы которые возможно НЕ нужны:

1. **Neuron System** (`src/neurons/`)
   - Used in simulations: NONE directly
   - Purpose: Framework detection, linting
   - Decision needed: Keep for future or remove?

2. **Graph Store** (`src/services/graph-store.service.ts`)
   - Used in simulations: NONE
   - Purpose: Entity relationships
   - Decision needed: Keep or remove?

3. **Framework Extractor** (`src/services/framework-extractor.service.ts`)
   - Used in simulations: NONE
   - Purpose: Auto-detection of project frameworks
   - Decision needed: Integrate with RAG or remove?

4. **Entity Recognizer** (`src/services/entity-recognizer.service.ts`)
   - 21k lines - massive service
   - Used in simulations: NONE explicitly
   - Purpose: Code entity recognition
   - Decision needed: Keep parts or full rewrite?

5. **Phase Machine** (`src/services/phase-machine.service.ts`)
   - Used in simulations: NONE explicitly
   - Purpose: Task phase management
   - Decision needed: Used by neurons only?

6. **Custom Lint Neurons** (`src/neurons/lint-*.neuron.ts`)
   - Used in simulations: NONE
   - Purpose: PHP, PowerShell, Accessibility linting
   - Decision needed: Remove or keep as optional?

### 2.3 Missing Systems (Need Implementation)
Системы которых НЕТ но нужны по симуляциям:

1. **Task Capture System**
   - Needed for: coder-smart, task-decomposition
   - Purpose: Capture and structure user tasks
   - Priority: HIGH

2. **Task Decomposition Engine**
   - Needed for: task-decomposition
   - Purpose: Break tasks into subtasks → steps → actions
   - Priority: HIGH

3. **Clarification System**
   - Needed for: coder-smart (rag-clarify)
   - Purpose: Ask clarifying questions before execution
   - Priority: MEDIUM

4. **Research Planning System**
   - Needed for: coder-smart (rag-research-plan)
   - Purpose: Create research/execution plans
   - Priority: MEDIUM

5. **Checklist Manager**
   - Needed for: coder-smart
   - Purpose: Track checklist items
   - Priority: MEDIUM

6. **Document Writer**
   - Needed for: coder-smart, task-decomposition
   - Purpose: Write structured documents (.carrier/)
   - Priority: HIGH

## Phase 3: Decision Points

### 3.1 User Decisions Required
Для каждой системы из "Potentially Unused" пользователь должен выбрать:

**Option A: Keep**
- Migrate to use in simulations
- Document use case

**Option B: Remove**
- Archive code
- Update dependencies

**Option C: Refactor/Integrate**
- Merge with existing system
- Simplify functionality

### 3.2 Implementation Priority
1. **P0 (Critical)**: Form, RAG, File Ops, Script Engine
2. **P1 (High)**: Task Capture, Decomposition, Document Writer
3. **P2 (Medium)**: Command Execution, Clarification, Research Planning
4. **P3 (Low)**: Checklist, Message Display

## Phase 4: Execution Tasks

### Task 1: Inventory Check
- [ ] Проверить каждую систему из 2.1 на существование
- [ ] Сопоставить с simulations/ реальным использованием
- [ ] Создать отчет о покрытии

### Task 2: Mark Unused Systems
- [ ] Добавить комментарии `@deprecated` к системам из 2.2
- [ ] Создать список для пользовательского решения
- [ ] Оценить effort удаления каждой системы

### Task 3: Implement Missing Systems
- [ ] Создать задачи на реализацию систем из 2.3
- [ ] Приоритизировать по P0/P1/P2/P3
- [ ] Оценить effort реализации

### Task 4: Align with Simulations
- [ ] Обновить server transforms для всех симуляций
- [ ] Убедиться что action-keys соответствуют спецификации
- [ ] Прогнать все симуляции через валидатор

## Next Steps
1. Выполнить Task 1 (Inventory Check)
2. Представить пользователю список решений по 2.2
3. По мере решений - архивировать или рефакторить
4. Реализовать missing systems из 2.3
