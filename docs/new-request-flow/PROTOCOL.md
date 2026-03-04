# Протокол взаимодействия

---
doc:
  id: new-request-flow/protocol
  type: spec
  machine_readable: true
  tags: [protocol, execute, result, action-key-shape]
  references:
    - docs/DOCUMENTATION-MACHINE-READABLE.md
    - docs/new-request-flow/SCHEMAS.md
---

## Обзор

Протокол определяет формат запросов и ответов между компонентами системы:

- **Web → Client API** (порт 3001)
- **Client API → Server** (порт 3000)

**ВАЖНО:** Сервер полностью STATELESS - не хранит сессии, только обрабатывает запросы.

## Action-key shape (ОБЯЗАТЕЛЬНО)

Все `result` и `execute` объекты должны использовать **action-key shape** — результат и параметры действия оборачиваются в ключ с названием действия:

```json
// ✅ Правильно:
{ "result": { "script": { "broken_imports": [...] } } }
{ "execute": { "read-file": { "path": "..." } } }
{ "result": { "rag-search": { "results": [...], "files": [...] } } }

// ❌ Неправильно:
{ "result": { "content": "..." } }
{ "execute": { "action": "read-file", "file": "..." } }
```

### Правила action-key shape

| Действие | Правильная структура execute | Правильная структура result |
|----------|------------------------------|-----------------------------|
| `script` | `"execute": { "script": { "input": {...}, "output": "...", "code": "..." } }` | `"result": { "script": { "output": "..." } }` |
| `read-file` | `"execute": { "read-file": { "path": "..." } }` | `"result": { "read-file": { "path": "...", "content": "..." } }` |
| `write-file` | `"execute": { "write-file": { "path": "...", "content": "..." } }` | `"result": { "write-file": { "path": "...", "success": true } }` |
| `rag-search` | `"execute": { "rag-search": { "query": "..." } }` | `"result": { "rag-search": { "results": [...], "files": [...] } }` |
| `execute-command` | `"execute": { "execute-command": { "command": "..." } }` | `"result": { "execute-command": { "command": "...", "exitCode": 0, "stdout": "...", "stderr": "" } }` |
| `form` | `"execute": { "form": { "input": [...] } }` | `"result": { "message": "..." }` или `"result": { "choice": "..." }` |
| `message` | `"execute": { "message": "..." }` | — (UI only) |

**Почему это важно:**
- Сервер точно знает, какое действие выполнялось
- Избегаем коллизий имён параметров (например, `action` как ключ и как имя действия)
- Упрощается отладка и логирование

## Два типа действий: Actions vs AI-Actions

В первом ответе сервер предлагает два типа действий с разной логикой шагов:

### 1. Actions (первоочередные, hardcoded steps)

**Характеристики:**
- Кроки захардкожены в definition действия
- Сервер сам переключает `execution.step` на основе `result`
- Предсказуемый, алгоритмический поток
- **Примеры:** [`fix-vue-imports`](simulations/fix-vue-imports/description.md), [`phpunit-deprecations`](simulations/phpunit-deprecations/description.md)

**Структура execution:**
```json
{
  "execution": {
    "action": "fix-vue-imports",
    "step": "vue-import-detect"
  }
}
```

**Поток выполнения:**
```
request.json → response.json (execute.script, step: "vue-import-detect")
     ↑________________↓
request.json (result.script) → response.json (execute.script, step: "vue-import-resolve")
     ↑________________↓
...автоматическое переключение шагов...
```

**Важно:** Клиент не выбирает следующий шаг — сервер определяет его из `context.execution.step` и `result` предыдущего шага.

### 2. AI-Actions (второстепенные, LLM-управляемые)

**Характеристики:**
- Кроки не в фиксированной последовательности
- Сервер показывает список *доступных* шагов
- Следующий шаг определяется из ответа LLM
- Возможны отдельные запросы на каждый шаг
- **Примеры:** [`dialog`](simulations/dialog/description.md), [`coder`](simulations/coder/description.md), [`coder-smart`](simulations/coder-smart/description.md)

**Структура execution:**
```json
{
  "execution": {
    "action": "coder",
    "step": "llm-request"
  }
}
```

**Поток выполнения:**
```
request.json → request.md (LLM prompt) → response.md (LLM output)
                                          ↓
                   response.json ← server-transforms-response.json
                          ↓
              (execute.message, execute.form, или execute.read-file/rag-search/...)
```

**Важно:** LLM решает, какое действие выполнить следующим. Сервер транслирует ответ LLM в `execute` для клиента.

### Сравнительная таблица

| Аспект | Actions | AI-Actions |
|--------|---------|------------|
| Определение шагов | Hardcoded в definition | Динамические, LLM-выбранные |
| Переключение шагов | Сервер автоматически | LLM определяет из ответа |
| Нужен LLM | Нет (только для первого matching) | Да, на каждый шаг |
| `execution.step` | Конкретное имя шага | Часто просто `"llm-request"` |
| Примеры | fix-vue-imports, phpunit-deprecations | dialog, coder, auto-ai |
| Сложность | Простая, алгоритмическая | Сложная, требует рассуждений |

## Схемы запросов/ответов

### 1. Первый запрос: Поиск сервисов (router через form.choices)

Пользователь вводит задачу, система через **router** предлагает доступные варианты виконання. **Канон
(по `simulations/SCHEMA.md`)**: первый ответ идёт через `execute.form.choices` (список опций), где `choices[].id` — ID
действия (`fix-vue-imports`, `auto-ai`, `task-decomposition`, `dialog`, `coder` и т.п.).

> **💡 Best Practice:** Deterministic Actions (например `fix-vue-imports`, `phpunit-deprecations`) должны быть первыми
> в списке `form.choices`, а AI-actions (`auto-ai`, `coder`, `dialog`) — после них. Это обеспечивает высокую
> производительность для простых задач и использует LLM как fallback.

Формат с `actions[]` и `fallbackActions[]` в ответе считается **legacy** и используется только для совместимости; новые
симуляции и сервер должны опираться на `execute.form.choices` + `result.choice`.

#### Запрос (Web → Client API)

```typescript
// В URL: POST /api/sessions
interface TaskRequest {
  task: string;                    // Описание задачи пользователя
  provider?: string;               // Провайдер (опционально)
  projectId: string;               // ID проекта
}
```

**Пример:**

```json
// POST /api/sessions
{
  "task": "виправити імпорти у vue компонентах",
  "projectId": "proj_12345"
}
```

#### Ответ от Server (через Client API, новый формат — канон)

```typescript
interface FirstResponseFormChoices {
  context: {
    task: string;
    // НЕТ sessionId/projectId - сервер stateless!
  };
  execute: {
    form: {
      title?: string;
      choices: Array<{ id: string; label: string }>;
    };
  };
}
```

**Пример (как в simulations/fix-vue-imports/1/response.json):**

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
          "label": "Виправити зламані імпорти у Vue файлах (автомат)"
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator — згенерувати екшен за допомогою LLM"
        },
        {
          "id": "task-decomposition",
          "label": "Декомпозиція задачі вручну"
        }
      ]
    }
  }
}
```

### Новый контекст для последующих запросов
После выбора действия клиент собирает `context` (включая `task` и `execution`) и, при необходимости, дополнительные поля `execution`, `action`, `task` рядом. Следующий `request.json` отправляется с этим контекстом и, если есть, `result` — именно клиент записывает `execution` (action + step), а не сервер.
Сервер ожидает, что `context` содержит `task` и `execution`; эти поля обязательны при валидации [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json), тогда как `result` необязательно и добавляется лишь при новых данных (выбор, сообщение, результат скрипта и т.п.). `projectId`/`sessionId` остаются внутри UI и не передаются дальше.

#### Legacy-формат ответа (actions[])

Для старых симуляций/реализаций допускается формат с `actions[]` и `fallbackActions[]` (см. также `SCHEMAS.md`), но
новые симуляции и сервер должны ориентироваться на `execute.form.choices`.

---

### 2. Выбор действия

Пользователь выбирает действие из предложенных.

#### Запрос (Web → Client API)

```typescript
interface ActionSelectionRequest {
  action: 'action_selection';
  sessionId: string;
  projectId: string;
  selectedAction: string;           // ID выбранного действия
}
```

**Пример:**

```json
{
  "action": "action_selection",
  "sessionId": "sess_abcde",
  "projectId": "proj_12345",
  "selectedAction": "fix-vue-imports"
}
```

---

### 3. Выполнение шага (Server → Client)

Сервер отправпт для выполляет скринения на клиенте.

#### Ответ от Server (через Client API)

```typescript
interface ExecuteResponse {
  context: {
    task: string;
    execution: {
      action: string;              // ID текущего действия
      step: string;                // ID текущего шага
      status?: string;             // "completed" для последнего шага
    };
  };
  execute: {
    script: {
      input: Record<string, any>;  // Входные данные для скрипта
      output: string;              // Ожидаемый формат вывода
      code: string;                // DSL код для выполнения
    };
  };
  finalResult?: {                  // Присутствует только в последнем ответе
    action: string;
    summary: Record<string, any>;
  };
}
```

**Пример (первый шаг):**

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "execute": {
    "script": {
      "input": {
        "rootDir": ".",
        "filePattern": "**/*.vue"
      },
      "output": "broken_imports[]",
      "code": "// vue-import-detect.dsl\nconst result = await script.execute('vue-import-detect', { rootDir, filePattern });"
    }
  }
}
```

---

### 4. Результат выполнения (Client → Server)

Клиент отправляет результат выполнения скрипта.

#### Запрос (Client API → Server)

```typescript
interface StepResultRequest {
  context: {
    task: string;
    execution: {
      action: string;
      step: string;
    };
  };
  result: Record<string, any>;      // Результат выполнения скрипта
}
```

**Пример:**

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "result": {
    "script": {
      "broken_imports": [
        { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "import": "import Header from '../components/Header'" },
        { "file": "resources/js/Pages/Auth/Register.vue", "line": 5, "import": "import { helper } from '../../utils/helpers'" }
      ]
    }
  }
}
```

---

### 5. Ответ сервера на результат

Сервер отправляет следующий шаг или завершает выполнение.

**Пример (второй шаг):**

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "execute": {
    "script": {
      "input": {
        "broken_imports": [
          { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "import": "import Header from '../components/Header'" }
        ],
        "aliases": { "@": "resources/js", "~": "resources" }
      },
      "output": "patches[]",
      "code": "// vue-import-resolve.dsl\nconst result = await script.execute('vue-import-resolve', { broken_imports, aliases });"
    }
  }
}
```

---

### 6. Завершение (финальный результат)

**Пример:**

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-cleanup",
      "status": "completed"
    }
  },
  "execute": {
    "script": {
      "input": {},
      "output": "cleanup_count",
      "code": "// vue-import-cleanup.dsl\nconst result = await script.execute('vue-import-cleanup', {});"
    }
  },
  "finalResult": {
    "action": "fix-vue-imports",
    "summary": {
      "broken_imports_found": 3,
      "patches_resolved": 3,
      "files_fixed": 3,
      "cleanup_count": 0
    }
  }
}
```

---

## Web → Client API эндпоинты

### POST /api/sessions

Создать новую сессию.

```typescript
// Request
{
  projectId: string;
  task: string;
  provider?: string;
}

// Response
{
  sessionId: string;
  status: 'pending' | 'ready';
  context: { task: string };
  actions?: Action[];
  fallbackActions?: FallbackAction[];
}
```

### GET /api/sessions

Получить список всех сессий.

```typescript
// Response
{
  sessions: SessionSummary[];
}

interface SessionSummary {
  sessionId: string;
  projectId: string;
  task: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```

### GET /api/sessions/:sessionId

Получить состояние сессии.

```typescript
// Response
{
  sessionId: string;
  projectId: string;
  task: string;
  status: SessionStatus;
  context: { task: string; execution?: { action: string; step: string } };
  selectedAction?: string;
  currentStepIndex?: number;
  results: StepResult[];
  logs: string[];
}
```

### POST /api/sessions/:sessionId/action

Выбрать действие.

```typescript
// Request
{
  selectedAction: string;
}

// Response
{
  status: 'ready';
  context: { task: string; execution: { action: string; step: string } };
}
```

### POST /api/sessions/:sessionId/next

Выполнить следующий шаг.

```typescript
// Request
{
  mode: 'manual' | 'auto';
}

// Response
{
  status: 'in_progress' | 'completed' | 'waiting_confirmation';
  context: { task: string; execution: { action: string; step: string } };
  execute?: { script: { input: any; output: string; code: string } };
  finalResult?: { action: string; summary: any };
  canContinue: boolean;
  canStop: boolean;
}
```

### POST /api/sessions/:sessionId/cancel

Отменить сессию.

```typescript
// Response
{
  sessionId: string;
  status: 'cancelled';
}
```

---

## Client API → Server эндпоинты

**ВАЖНО:** Сервер полностью stateless - не хранит сессии.

- SessionId/ProjectId передаются в URL пути, а не в теле запроса
- Client API сама хранит всю информацию о сессиях

### Два типа ответов

Сервер может ответить синхронно или асинхронно.

#### Синхронный ответ

Сервер обрабатывает запрос без внешних AI - сразу возвращает результат:

```json
{
  "context": { ... },
  "actions?: Action[],     // Только в первом ответе
  "execute?: { script: { input, output, code } },
  "finalResult?: { action: string; summary: any }
}
```

#### Асинхронный ответ (с External AI Hub)

Когда сервер отправляет запрос к External AI Hub (прокси для Ollama), он использует `promiseId`:

```json
{
  "promiseId": "abc123def456",
  "status": "pending"
}
```

**Как работает promiseId:**

1. Сервер отправляет запрос к External AI Hub (порт 11434) с заголовком `X-Promise: true`
2. Hub сразу возвращает `promiseId` (статус pending)
3. Сервер продолжает workflow - отправляет execute клиенту
4. Сервер периодически опрашивает `GET /promise/{id}` для проверки статуса
5. Когда статус `done` - получает результат через `GET /promise/{id}/response`

**External AI Hub Endpoints:**

| Endpoint                     | Описание                            |
|------------------------------|-------------------------------------|
| `GET /promise/<id>`          | Статус promise (pending/done/error) |
| `GET /promise/<id>/response` | Получить результат                  |

### llmPrompt - Markdown для LLM

Поле `llmPrompt` в Step содержит ссылку на MD файл с prompt для LLM.

```typescript
interface Step {
  action: string;
  title: string;
  description: string;
  priority: number;
  input: string;
  output: string;
  llmPrompt?: string;  // Ссылка на MD файл (например: "ai-analyze-prompt.md")
}
```

**Как это работает:**

1. Server возвращает Action со Step, который содержит `llmPrompt`
2. Когда пользователь одобряет action, Server читает MD файл
3. Server отправляет содержимое MD файла как prompt к External AI Hub
4. External AI Hub возвращает `promiseId`
5. Server продолжает workflow, клиент ждёт результат

**Пример MD файла:**

```markdown
# AI Аналіз коду

Ти - експерт з аналізу коду.

## Завдання
Проаналізуй наступний код та надай детальні покращення.

## Формат відповіді

## 1. Проблеми продуктивності
- [проблема 1]

## 2. Рекомендовані покращення
### Високий пріоритет
1. [покращення 1]
```

### POST /api/v1/invoke

```typescript
// Request
{
  context?: {
    task?: string;
    execution?: {
      action: string;
      step: string;
    };
  };
  result?: Record<string, any>;    // Результат выполнения (для шагов после первого)
}

// Ответ сервера (синхронный - без LLM)
{
  context: { ... };
  actions?: Action[];              // Только в первом ответе
  execute?: { script: { input, output, code } };
  finalResult?: { action: string; summary: any }
}

// Ответ сервера (асинхронный - с LLM)
{
  promiseId: string;
  status: 'pending';
}
```

---

## Статусы сессии

| Статус                 | Описание                              |
|------------------------|---------------------------------------|
| `pending`              | Создана, ожидает выбора действия      |
| `ready`                | Выбрано действие, готова к выполнению |
| `in_progress`          | Выполняются шаги (steps)              |
| `waiting_confirmation` | Ожидает подтверждения пользователя    |
| `completed`            | Все шаги выполнены                    |
| `cancelled`            | Отменена пользователем                |
| `error`                | Ошибка при выполнении                 |

---

## Ключевые термины

| Старое (неправильно)   | Новое (правильно)                                |
|------------------------|--------------------------------------------------|
| `proposedActions`      | `actions`                                        |
| `subActions`           | `steps`                                          |
| `actionId` (в actions) | `action`                                         |
| `currentActionId`      | `execution.step`                                 |
| `executingAction`      | `execute`                                        |
| `dsl` + `dslScript`    | `script` с `input`, `output`, `code`             |
| -                      | `promiseId` - используется для async AI запросов |

---

## Правила

1. **Context propagation**: Контекст ВСЕГДА передается от сервера к клиенту и от клиента к серверу без изменений.
2. **Result outside context**: Результат выполнения клиента ВСЕГДА находится вне context.
3. **Server stateless**: Сервер не хранит состояние между запросами.
4. **Client executes scripts**: Сервер отправляет DSL скрипты, клиент их выполняет и возвращает результат.

---

## Дополнительная документация

- [SERVER-ARCHITECTURE.md](SERVER-ARCHITECTURE.md) — Server-centric документация (компоненты, Actions, AI-Actions, интеграция с External AI Hub)
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) — Каноничная схема симуляций

---

## JSON Schema

Протокол формализован через JSON Schema для обеспечения:
- Автоматической валидации request/response
- Генерации TypeScript клиентов
- Документации и автодополнения

### Схемы

| Файл | Описание |
|------|----------|
| `schemas/protocol/message.schema.json` | Базовый объект сообщения (user/assistant) |
| `schemas/protocol/context.schema.json` | Контекст выполнения (execution, history) |
| `schemas/protocol/action.schema.json` | Execute и Result объекты (action-key shape) |
| `schemas/protocol/request.schema.json` | A2A Request (initial/follow-up) |
| `schemas/protocol/response.schema.json` | A2A Response |
| `schemas/protocol/index.json` | Объединяющая схема |

### Использование

**Валидация запроса:**
```typescript
import { validateRequest, validateResponse } from './protocol/validator.js';

const result = validateRequest(requestData);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

**Валидация ответа:**
```typescript
const result = validateResponse(responseData);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

**Валидация action-key shape:**
```typescript
import { validateExecute, validateResult } from './protocol/validator.js';

// Проверка execute
const executeValid = validateExecute({ "script": { ... } });

// Проверка result
const resultValid = validateResult({ "choice": "fix-vue-imports" });
```

### Генерация TypeScript клиентов

Для генерации TypeScript типов из схем:

```bash
node scripts/generate-protocol-clients.js
```

Это создаст:
- `a2a-client/packages/types/src/protocol.ts` — типы для клиента
- `a2a-server/src/protocol/client-sdk.ts` — SDK для сервера

### OpenAPI спецификация

Полная OpenAPI 3.0 спецификация доступна в `openapi/a2a-api.yaml`.

```bash
# Валидация OpenAPI спецификации
npx swagger-cli validate openapi/a2a-api.yaml

# Генерация документации
npx @redocly/cli build-docs openapi/a2a-api.yaml
```

### Примеры валидации

**Корректный execute (action-key shape):**
```json
{ "execute": { "script": { "code": "...", "input": {}, "output": "string" } } }
{ "execute": { "read-file": { "path": "src/app.ts" } } }
{ "execute": { "form": { "title": "Выберите действие", "choices": [...] } } }
```

**Некорректный execute (плоская структура):**
```json
{ "execute": { "action": "script", "code": "..." } }  // ❌ Неправильно
```

**Корректный result:**
```json
{ "result": { "choice": "fix-vue-imports" } }
{ "result": { "script": { "output": "..." } } }
{ "result": { "read-file": { "path": "src/app.ts", "content": "..." } } }
```

## Runtime валидация

Валидатор интегрирован в middleware сервера:

```typescript
import { requestValidator, responseValidator } from './protocol/validator.js';

// Middleware для Express
app.post('/requests', requestValidator, handler);
```

Для отключения валидации в разработке:
```bash
SKIP_VALIDATION=1
```

## Критерии завершения

- [x] JSON Schema для всех объектов протокола
- [x] Генератор TypeScript клиентов
- [x] OpenAPI спецификация
- [x] Runtime валидация протокола
- [x] Обновленная документация
- [ ] Примеры валидации (добавлены в документацию)
