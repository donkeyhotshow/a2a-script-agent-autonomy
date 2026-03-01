# Схемы данных (Schemas)

## Обзор

Этот документ определяет форматы данных для всех этапов взаимодействия.

---

## 1. Session

```typescript
interface Session {
  id: string;                    // sess_xxx
  projectId: string;             // proj_xxx
  task: string;                  // Текст задачи пользователя
  status: SessionStatus;
  context: Context;
  actions?: Action[];            // Предложенные действия
  fallbackActions?: FallbackAction[];
  selectedAction?: Action;       // Выбранное действие
  currentStepIndex: number;      // Текущий шаг
  results: StepResult[];        // Результаты выполнения
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

type SessionStatus = 
  | 'pending'    // Ожидает выбора действия
  | 'ready'      // Действие выбрано
  | 'in_progress' // Выполняется
  | 'waiting_confirmation' // Ожидает подтверждения
  | 'completed'  // Завершено
  | 'error'      // Ошибка
  | 'cancelled'; // Отменено
```

---

## 2. Context

```typescript
interface Context {
  task: string;
  execution?: {
    action: string;    // ID действия
    step: string;      // ID текущего шага
    status?: 'completed';
  };
  history?: Message[];
  // ...дополнительные данные
}
```

---

## 3. Action

```typescript
interface Action {
  action: string;              // ID: "fix-vue-imports"
  title: string;               // "Виправити імпорти"
  description: string;
  priority: number;
  matchScore: number;
  llmPrompt?: string;          // Markdown для LLM
  steps: Step[];
}

interface FallbackAction {
  mode: 'auto-ai' | 'task-decomposition';
  title: string;
  description: string;
  fallbackType: 'llm_generation' | 'manual';
}
```

---

## 4. Step

```typescript
interface Step {
  action: string;              // ID шага: "vue-import-detect"
  title: string;
  description: string;
  priority: number;
  input: string;                // none | broken_imports[] | ...
  output: string;               // broken_imports[] | patches[] | ...
  llmPrompt?: string;           // Ссылка на .md файл
}
```

---

## 5. Execute

Canonical: **each key = action type**, value = params. No flat `action` + params as siblings.

```typescript
// One key = action type, value = params. Examples:
// script: { input, output, code }; form: { input }; read-file: { path }; write-file: { path, content }; rag-search: { query }; etc.
type Execute = Record<string, unknown>;
// Optional: promiseId, finalResult for async flows
```

**Good:** `execute: { "read-file": { "path": "src/auth.js" } }`, `execute: { "write-file": { "path": "...", "content": "..." } }`, `execute: { "form": { "input": [...] } }`.  
**Bad:** `execute: { "action": "read-file", "file": "src/auth.js" }`.

---

## 6. Request (Client → Server)

```typescript
// Первый запрос — только task (см. simulations/SCHEMA.md)
// POST /api/v1/invoke
interface InvokeRequest {
  task?: string;                 // Первый запрос: только task
  context?: Context;              // Последующие: context с сервера
  result?: { action?: string; message?: string; [k: string]: any }; // result.action = выбранное действие
}
```

---

## 7. Response (Server → Client)

```typescript
// Первый ответ (actions)
interface ActionsResponse {
  context: Context;
  actions: Action[];
  fallbackActions?: FallbackAction[];
}

// Ответ с execute
interface ExecuteResponse {
  context: Context;
  execute: Execute;
}

// Ответ завершения
interface CompletedResponse {
  context: Context;
  execute: Execute;              // с finalResult
}

// Асинхронный ответ
interface PendingResponse {
  promiseId: string;
  status: 'pending';
}
```

---

## 8. Web → Client API

```typescript
// POST /api/sessions
interface CreateSessionRequest {
  projectId: string;
  task: string;
  provider?: string;
}

interface CreateSessionResponse {
  sessionId: string;
  status: 'pending';
  context: Context;
  actions: Action[];
}

// POST /api/sessions/:id/action
interface SelectActionRequest {
  selectedAction: string;
}

// POST /api/sessions/:id/next
interface NextStepRequest {
  mode: 'manual' | 'auto';
}

interface NextStepResponse {
  status: SessionStatus;
  context: Context;
  execute?: Execute;
  canContinue: boolean;
  canStop: boolean;
}
```

---

## Примеры

### Пример: Session (файл)

```json
{
  "id": "sess_abc123",
  "projectId": "proj_xyz789",
  "task": "виправити імпорти у vue компонентах",
  "status": "in_progress",
  "context": {
    "task": "виправити імпорти...",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "actions": [...],
  "selectedAction": {
    "action": "fix-vue-imports",
    "steps": [...]
  },
  "currentStepIndex": 1,
  "results": [
    {
      "step": "vue-import-detect",
      "status": "success",
      "output": { "broken_imports": [...] }
    }
  ],
  "logs": ["Starting...", "Found 5 broken imports"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## Где используется

| Schema | Где используется |
|--------|------------------|
| Session | Client API, Web UI |
| Context | Server, Client API |
| Action | Server → Client |
| Step | Server, Client |
| Execute | Server → Client |
| InvokeRequest | Client → Server |
| InvokeResponse | Server → Client |
