# Task 21: Implement Missing Systems

## Goal
Реализовать системы, необходимые для симуляций но отсутствующие в сервере.

## Priority P0 (Critical)

### 1. Task Capture System
**Needed for**: coder-smart, task-decomposition
**Files to create**:
- `src/services/task-capture.service.ts`
- `src/actions/handlers/capture-task.ts`

**Interface**:
```typescript
interface TaskCaptureService {
  capture(input: string): Promise<CapturedTask>;
  structure(task: CapturedTask): Promise<StructuredTask>;
}
```

### 2. Task Decomposition Engine  
**Needed for**: task-decomposition
**Files**:
- `src/services/task-decomposition.service.ts`
- `src/actions/handlers/decompose-*.ts`

**Interface**:
```typescript
interface TaskDecompositionService {
  decomposeToSubtasks(task: StructuredTask): Promise<Subtask[]>;
  decomposeToSteps(subtask: Subtask): Promise<Step[]>;
  decomposeToActions(step: Step): Promise<Action[]>;
}
```

### 3. Document Writer Service
**Needed for**: coder-smart, task-decomposition
**Files**:
- `src/services/document-writer.service.ts`
- `src/actions/handlers/write-doc.ts`

## Priority P1 (High)

### 4. Clarification System
- `src/services/clarification.service.ts`
- `src/actions/handlers/rag-clarify.ts`

### 5. Research Planning System
- `src/services/research-planning.service.ts`
- `src/actions/handlers/rag-research-plan.ts`

### 6. Checklist Manager
- `src/services/checklist.service.ts`
- `src/actions/handlers/checklist.ts`

## Acceptance Criteria
- [ ] Все P0 системы реализованы
- [ ] Action handlers зарегистрированы в registry
- [ ] Тесты для каждой системы
- [ ] Симуляции coder-smart и task-decomposition проходят
