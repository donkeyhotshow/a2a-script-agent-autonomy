# Схемы данных (Schemas)

## Обзор

Этот документ определяет форматы данных для всех этапов взаимодействия.

---

## 1. Session

```
typescript
interface Session {
  id: string;                    // sess_xxx
  projectId: string;             // proj_xxx
  task: string;                  // Текст задачи пользователя
  status: SessionStatus;
  context: Context;
  actions?: Action[];            // Предложенные действия (устарело, использовать execute.form.choices)
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

```
typescript
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

Два типа в первой ответе сервера: **actions** (первоочередно) — шаги захардкожены, сервер переключает шаг; **ai-actions
** (второчередно) — список доступных шагов для отображения, следующий шаг из ответа LLM, возможен отдельный запрос на
шаг.

```
typescript
interface Action {
  action: string;              // ID: "fix-vue-imports"
  title: string;               // "Виправити імпорти"
  description: string;
  priority: number;
  matchScore: number;
  llmPrompt?: string;          // Markdown для LLM
  steps: Step[];               // actions: hardcoded; ai-actions: available steps, next from LLM
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

Для **actions**: шаги в definition задают последовательность; сервер сам переключает. Для **ai-actions**: шаги — список
доступных (для отображения); какой шаг следующий решает LLM по своему ответу.

```
typescript
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

```
typescript
// One key = action type, value = params. Examples:
// script: { input, output, code }; form: { input }; read-file: { path }; write-file: { path, content }; rag-search: { query }; execute-command: { command }; etc.
type Execute = Record<string, unknown>;
// Optional: promiseId for async flows
```

**Good:** `execute: { "read-file": { "path": "src/auth.js" } }`,
`execute: { "write-file": { "path": "...", "content": "..." } }`, `execute: { "form": { "input": [...] } }`,
`execute: { "execute-command": { "command": "npm test" } }`.  
**Bad:** `execute: { "action": "read-file", "file": "src/auth.js" }`.

### Execute Form з choices (для вибору дій)

```
typescript
interface FormChoice {
  id: string;       // ID вибору: "fix-vue-imports", "auto-ai", "task-decomposition"
  label: string;   // Label: "Виправити імпорти", "AI Action Generator" тощо
}

interface FormWithChoices {
  title?: string;   // Заголовок форми: "Оберіть спосіб виконання"
  choices: FormChoice[];
}

// Приклад execute.form з choices:
execute: {
  "form": {
    "title": "Оберіть спосіб виконання",
    "choices": [
      { "id": "fix-vue-imports", "label": "Виправити імпорти" },
      { "id": "auto-ai", "label": "AI Action Generator" },
      { "id": "task-decomposition", "label": "Декомпозиція задачі" }
    ]
  }
}
```

---

## 6. Request (Client → Server)

```
typescript
// Первый запрос — только task (см. simulations/SCHEMA.md)
// POST /api/v1/invoke
interface InvokeRequest {
  task?: string;                 // Первый запрос: только task
  context?: Context;              // Последующие: context с сервера
  result?: { choice?: string; action?: string; message?: string; [k: string]: any }; // result.choice = выбранный id из execute.form.choices; result.action = выбранное действие
}
```

---

## 7. Response (Server → Client)

```typescript
// Первый ответ с execute.form.choices (новый формат)
interface FormChoicesResponse {
  context: Context;
  execute: {
    form: {
      title?: string;
      choices: Array<{ id: string; label: string }>;
    };
  };
}

// Первый ответ (actions) - устарело, использовать execute.form.choices
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
  execute: Execute;
  result?: Record<string, unknown>; // e.g. { completed: true } or action-key payloads
}

// Асинхронный ответ
interface PendingResponse {
  promiseId: string;
  status: 'pending';
}
```

---

## 8. Web → Client API

```
typescript
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
  execute: {
    form: {
      title?: string;
      choices: Array<{ id: string; label: string }>;
    };
  };
}

// POST /api/sessions/:id/action
interface SelectActionRequest {
  selectedAction: string;  // або selectedChoice: string
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

## 9. JSON Schema Files

В директории [`json-schemas/`](json-schemas/) находятся JSON Schema (draft-07) для валидации запросов и ответов. Все схемы совместимы с AJV.

### 9.1 Server Invoke Schemas

| Schema File | Description | Used For |
|-------------|-------------|----------|
| [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json) | Запрос к Server API (`POST /api/v1/invoke`) | Client API → Server |
| [`server-invoke-response-first-form.schema.json`](json-schemas/server-invoke-response-first-form.schema.json) | Первый ответ с `execute.form.choices` | Server → Client API |
| [`server-invoke-response-execute.schema.json`](json-schemas/server-invoke-response-execute.schema.json) | Ответ с `execute` (script, read-file, write-file, rag-search, execute-command, list-directory, grep-search, form, message) | Server → Client API |
| [`server-invoke-response-pending.schema.json`](json-schemas/server-invoke-response-pending.schema.json) | Асинхронный ответ с `promiseId` | Server → Client API |

#### Supported Execute Types (server-invoke-response-execute.schema.json)

| Type | Properties | Description |
|------|------------|-------------|
| `form` | `title`, `choices[]`, `input[]` | Форма с выбором действий или полями ввода |
| `message` | `string` или `object` | Сообщение для отображения в UI |
| `script` | `input`, `output`, `code` | DSL скрипт для выполнения на клиенте |
| `read-file` | `path` | Запрос на чтение файла |
| `write-file` | `path`, `content` | Запрос на запись файла |
| `rag-search` | `query` | RAG поиск по кодовой базе |
| `execute-command` | `command` | Выполнение shell команды |
| `list-directory` | `path` | Список содержимого директории |
| `grep-search` | `pattern`, `path?`, `glob?` | Поиск по шаблону в файлах |

### 9.2 Server Transform Schema

| Schema File | Description | Used For |
|-------------|-------------|----------|
| [`server-transform.schema.json`](json-schemas/server-transform.schema.json) | Pipeline операций для трансформации данных | Server preprocessing/postprocessing |

Поддерживаемые операции: `copy`, `set`, `append-to-array`, `parse-json-from-md`, `render-markdown`, `switch`.

### 9.3 Client Result Schema

| Schema File | Description | Used For |
|-------------|-------------|----------|
| [`client-result.schema.json`](json-schemas/client-result.schema.json) | Action-key shaped результаты от клиента | Client → Server |

#### Supported Result Types

| Type | Properties | Description |
|------|------------|-------------|
| `script` |任意 | Результат выполнения DSL скрипта |
| `read-file` | `path`, `content`, `error?` | Результат чтения файла |
| `write-file` | `path`, `success?`, `bytesWritten?`, `error?` | Результат записи файла |
| `rag-search` | `query?`, `results[]`, `files[]` | Результат RAG поиска |
| `execute-command` | `command`, `exitCode`, `stdout?`, `stderr?` | Результат выполнения команды |
| `list-directory` | `path`, `entries[]`, `error?` | Результат листинга директории |
| `grep-search` | `pattern`, `matches[]`, `files[]` | Результат grep поиска |
| `choice` | `string` | ID выбранного действия |
| `message` | `string` | Сообщение от пользователя |

### 9.4 Web ↔ Client API Schemas

| Schema File | Description | Used For |
|-------------|-------------|----------|
| [`web-client-api-request.schema.json`](json-schemas/web-client-api-request.schema.json) | Запрос от Web UI к Client API | Web → Client API (5173 `/api/a2a/*` или SDK :3001) |
| [`web-client-api-response.schema.json`](json-schemas/web-client-api-response.schema.json) | Ответ от Client API к Web UI | Client API → Web (тот же origin/порт) |

#### Request Types (web-client-api-request.schema.json)

| Type | Required Fields | Description |
|------|-----------------|-------------|
| First Request | `task`, `projectId` | Начало новой сессии |
| Action Selection | `action`, `sessionId`, `projectId`, `selectedAction` | Выбор действия |
| Continue Request | `context`, `result` | Продолжение с результатом |

### 9.5 Using Schemas for Validation

```typescript
import Ajv from 'ajv';
import serverInvokeRequestSchema from './json-schemas/server-invoke-request.schema.json';

const ajv = new Ajv({ strict: false });
const validate = ajv.compile(serverInvokeRequestSchema);

const isValid = validate(requestData);
if (!isValid) {
  console.error(validate.errors);
}
```

### 9.6 Schema Versioning

- **Version**: draft-07 (compatible with AJV)
- **$id**: All schemas use `https://a2a-script-agent/new-request-flow/json-schemas/` prefix
- **Compatibility**: Schemas are forward-compatible with protocol extensions via `additionalProperties: true` where appropriate

### 9.7 File Locations

```
docs/new-request-flow/json-schemas/
├── server-invoke-request.schema.json         # POST /api/v1/invoke request
├── server-invoke-response-first-form.schema.json  # First response with form choices
├── server-invoke-response-execute.schema.json     # Execute response (all action types)
├── server-invoke-response-pending.schema.json     # Async pending response
├── server-transform.schema.json                   # Transform pipeline
├── client-result.schema.json                      # Client result objects
├── web-client-api-request.schema.json             # Web → Client API request
└── web-client-api-response.schema.json            # Client API → Web response
```

---

## Примеры

### Пример: execute.form.choices (новый формат)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах"
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        {
          "id": "fix-vue-imports",
          "label": "Виправити зламані імпорти у Vue файлах"
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator"
        },
        {
          "id": "task-decomposition",
          "label": "Декомпозиція задачі"
        }
      ]
    }
  }
}
```

### Пример: Session (файл)

```
json
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

| Schema         | Где используется   |
|----------------|--------------------|
| Session        | Client API, Web UI |
| Context        | Server, Client API |
| Action         | Server → Client    |
| Step           | Server, Client     |
| Execute        | Server → Client    |
| InvokeRequest  | Client → Server    |
| InvokeResponse | Server → Client    |
| ServerTransform| Simulations (per‑step JSON transforms) |

---

## История изменений

> **⚠️ Важно:** Старый формат (`actions[]`, `proposedActions`, `subActions`, `executingAction`, `dslScript`) устарел.
> Используйте `execute.form.choices` для первого ответа и action-key shape.
> 
> **См.:** [PROTOCOL.md](PROTOCOL.md)

- **2025-01**: Добавлен новый формат `execute.form.choices` для первого ответа сервера. Вместо `actions[]` и
  `fallbackActions[]` теперь используется `execute.form.choices` с массивом объектов `{ id, label }`.
  
  > **Примечание:** Формат с `actions[]` и `fallbackActions[]` считается **legacy** и используется только для совместимости.
 - **2026-03**: `server-transforms-request.md` / `server-transforms-response.md` мигрируют в
   `server-transforms-request.json` / `server-transforms-response.json` с JSONPath‑based pipeline (см.
   `json-schemas/server-transform.schema.json`).
