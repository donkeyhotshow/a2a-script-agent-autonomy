# Task 20: User Decisions on Unused Systems

## Goal
Представить пользователю список систем для принятия решения.

## Systems Awaiting Decision

### High Impact (Large Codebases)
1. **entity-recognizer.service.ts** (~21k lines)
   - Purpose: Code entity recognition
   - Simulations usage: NONE
   - Options:
     - [ ] KEEP - integrate with RAG for smart file selection
     - [ ] REMOVE - archive and delete
     - [x] REFACTOR - extract useful parts, remove rest

2. **phase-machine.service.ts** (~14k lines)
   - Purpose: Task phase management
   - Simulations usage: NONE (only by neurons)
   - Options:
     - [ ] KEEP - use for task-decomposition simulation
     - [ ] REMOVE - delete
     - [x] MERGE - integrate into context-manager

3. **framework-extractor.service.ts** (~9k lines)
   - Purpose: Auto-detection of project frameworks
   - Simulations usage: NONE
   - Options:
     - [ ] KEEP - integrate with RAG initialization
     - [x] REMOVE - delete

4. **graph-store.service.ts** (~7k lines)
   - Purpose: Entity relationships storage
   - Simulations usage: NONE
   - Options:
     - [ ] KEEP - use for advanced code analysis
     - [x] REMOVE - delete

### Medium Impact
5. **neurons/ directory** (lint-*.neuron.ts)
   - Purpose: PHP, PowerShell, Accessibility, Inertia linting
   - Simulations usage: NONE
   - Options:
     - [x] KEEP - optional plugins
     - [ ] REMOVE - delete
     - [ ] ARCHIVE - move to separate package

## Decision Template
Для каждой системы пользователь должен выбрать:
- Decision: KEEP / REMOVE / REFACTOR
- Reason: Почему принято такое решение
- Action: Что делать (конкретные шаги)

## Output
Создать `docs/server-cleanup-decisions.md` с решениями пользователя.
