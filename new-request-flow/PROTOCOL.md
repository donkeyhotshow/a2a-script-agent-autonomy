# Протокол взаимодействия

## Обзор

Протокол определяет формат запросов и ответов между компонентами системы:
- **Web → Client API** (порт 3001)
- **Client API → Server** (порт 3000)

**ВАЖНО:** Сервер полностью STATELESS - не хранит сессии, только обрабатывает запросы.

## Схемы запросов/ответов

### 1. Первый запрос: Поиск сервисов

Пользователь вводит задачу, система предлагает доступные действия.

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

#### Ответ от Server (через Client API)

```typescript
interface ServerResponse {
  context: {
    task: string;
    // НЕТ sessionId/projectId - сервер stateless!
  };
  actions: Action[];               // Предложенные действия
  fallbackActions?: FallbackAction[];
}

interface Action {
  action: string;                  // ID действия (например: "fix-vue-imports")
  title: string;
  description: string;
  priority: number;
  matchScore: number;
  steps: Step[];
}

interface Step {
  action: string;                  // ID шага (например: "vue-import-detect")
  title: string;
  description: string;
  priority: number;
  input: string;                    // none | broken_imports[] | patches[] | fixed_files[]
  output: string;                   // broken_imports[] | patches[] | fixed_files[] | cleanup_count
  llmPrompt?: string;              // Ссылка на MD файл с prompt для LLM
}

interface FallbackAction {
  mode: 'auto-ai' | 'task-decomposition';
  title: string;
  description: string;
  fallbackType: 'llm_generation' | 'manual';
}
```

**Пример:**
```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах"
  },
  "actions": [
    {
      "action": "fix-vue-imports",
      "title": "Виправити зламані імпорти у Vue файлах",
      "description": "Автоматично визначити та виправити проблеми з імпортами",
      "priority": 10,
      "matchScore": 0.95,
      "steps": [
        {
          "action": "vue-import-detect",
          "title": "Визначити зламані імпорти",
          "description": "Сканує Vue файли і знаходить биті імпорти",
          "priority": 10,
          "input": "none",
          "output": "broken_imports[]"
        },
        {
          "action": "vue-import-resolve",
          "title": "Вирішити правильні шляхи",
          "description": "На основі списку битих імпортів знаходить правильні шляхи",
          "priority": 9,
          "input": "broken_imports[]",
          "output": "patches[]"
        },
        {
          "action": "vue-import-apply",
          "title": "Застосувати виправлення",
          "description": "Застосовує виправлення до файлів",
          "priority": 8,
          "input": "patches[]",
          "output": "fixed_files[]"
        },
        {
          "action": "vue-import-cleanup",
          "title": "Очистити тимчасові файли",
          "description": "Видаляє тимчасові файли після роботи",
          "priority": 7,
          "input": "none",
          "output": "cleanup_count"
        }
      ]
    }
  ],
  "fallbackActions": [
    {
      "mode": "auto-ai",
      "title": "AI Action Generator",
      "description": "Згенерувати новий екшен за допомогою LLM",
      "fallbackType": "llm_generation"
    },
    {
      "mode": "task-decomposition",
      "title": "Декомпозиція задачі",
      "description": "Розбити задачу на підзадачі вручну",
      "fallbackType": "manual"
    }
  ]
}
```

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
    "broken_imports": [
      { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "import": "import Header from '../components/Header'" },
      { "file": "resources/js/Pages/Auth/Register.vue", "line": 5, "import": "import { helper } from '../../utils/helpers'" }
    ]
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

| Endpoint | Описание |
|----------|----------|
| `GET /promise/<id>` | Статус promise (pending/done/error) |
| `GET /promise/<id>/response` | Получить результат |

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

| Статус | Описание |
|--------|----------|
| `pending` | Создана, ожидает выбора действия |
| `ready` | Выбрано действие, готова к выполнению |
| `in_progress` | Выполняются шаги (steps) |
| `waiting_confirmation` | Ожидает подтверждения пользователя |
| `completed` | Все шаги выполнены |
| `cancelled` | Отменена пользователем |
| `error` | Ошибка при выполнении |

---

## Ключевые термины

| Старое (неправильно) | Новое (правильно) |
|---------------------|-------------------|
| `proposedActions` | `actions` |
| `subActions` | `steps` |
| `actionId` (в actions) | `action` |
| `currentActionId` | `execution.step` |
| `executingAction` | `execute` |
| `dsl` + `dslScript` | `script` с `input`, `output`, `code` |
| - | `promiseId` - используется для async AI запросов |

---

## Правила

1. **Context propagation**: Контекст ВСЕГДА передается от сервера к клиенту и от клиента к серверу без изменений.
2. **Result outside context**: Результат выполнения клиента ВСЕГДА находится вне context.
3. **Server stateless**: Сервер не хранит состояние между запросами.
4. **Client executes scripts**: Сервер отправляет DSL скрипты, клиент их выполняет и возвращает результат.
