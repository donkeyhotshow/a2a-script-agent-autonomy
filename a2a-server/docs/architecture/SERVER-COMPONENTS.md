# Архитектурная документация A2A Server

## Содержание
1. [Routes](#routes)
2. [Services](#services)
3. [Actions](#actions)

---

## Routes

### 1. Основной роутер (index.ts)

**Файл:** [`src/routes/index.ts`](a2a-server/src/routes/index.ts)

**Назначение:**
- Центральная точка монтирования всех роутов
- Определение `/api/v1/invoke` - основного entry point для входящих запросов
- Health check endpoint

**Endpoints:**

| Method | Path | Назначение | Auth |
|--------|------|------------|------|
| POST | `/api/v1/invoke` | Создание нового запроса через invoke service | ✅ |
| GET | `/api/v1/health` | Проверка здоровья сервера | ❌ |

**Входные данные (invoke):**
```typescript
{
  context?: unknown;
  message?: string;
  code_blocks?: FileBlock[];
}
```

**Выходные данные:**
```typescript
{
  success: true;
  data: {
    promiseId: string;
    status: 'pending';
    message: string;
  }
}
```

**Взаимодействие:**
- [`invoke.service.ts`](a2a-server/src/services/invoke.service.ts) - создание promise
- [`auth.middleware.ts`](a2a-server/src/middleware/auth.middleware.ts) - аутентификация

---

### 2. Requests Routes (requests.routes.ts)

**Файл:** [`src/routes/requests.routes.ts`](a2a-server/src/routes/requests.routes.ts)

**Назначение:**
- API endpoints для асинхронной обработки запросов
- CRUD операции для requests
- Управление очередью (queue)

**Endpoints:**

| Method | Path | Назначение |
|--------|------|------------|
| POST | `/api/v1/requests` | Создание нового запроса |
| GET | `/api/v1/requests/:promiseId/status` | Получение статуса запроса |
| GET | `/api/v1/requests/:promiseId/result` | Получение полного результата |
| DELETE | `/api/v1/requests/queue/pending` | Отмена всех pending запросов |
| DELETE | `/api/v1/requests/:promiseId` | Отмена конкретного запроса |
| GET | `/api/v1/requests/queue/stats` | Статистика очереди |

**Входные данные (POST /requests):**
```typescript
{
  context: Record<string, unknown>;
  message?: string;
  codeBlocks?: Array<{ path: string; content: string }>;
  priority?: number;
}
```

**Выходные данные:**
```typescript
{
  success: true;
  data: {
    promiseId: string;
    requestId: string;
    status: 'pending';
  }
}
```

**Взаимодействие:**
- [`request.service.ts`](a2a-server/src/services/request.service.ts) - CRUD операции
- Prisma Client - работа с БД

---

### 3. Actions Routes (actions.routes.ts)

**Файл:** [`src/routes/actions.routes.ts`](a2a-server/src/routes/actions.routes.ts)

**Назначение:**
- Получение определений actions
- Поиск actions по запросу

**Endpoints:**

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/api/v1/actions/:actionId` | Получение action по ID |
| GET | `/api/v1/actions/search?q=` | Поиск actions |

**Выходные данные (search):**
```typescript
{
  success: true;
  data: {
    query: string;
    actions: Array<{
      id: string;
      title: string;
      description: string;
      priority: number;
      matchScore: number;
    }>;
  }
}
```

**Взаимодействие:**
- [`action-service.ts`](a2a-server/src/actions/action-service.ts) - бизнес-логика actions

---

### 4. SSE Routes (sse.routes.ts)

**Файл:** [`src/routes/sse.routes.ts`](a2a-server/src/routes/sse.routes.ts)

**Назначение:**
- Server-Sent Events для real-time коммуникации
- Стриминг событий клиентам

**Endpoints:**

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/api/v1/sse/:sessionId` | Подписка на события сессии |
| GET | `/api/v1/sse` | Глобальная подписка |

**SSE Events:**
- `connected` - подключение установлено
- `log` - лог сообщение
- `progress` - прогресс выполнения
- `status` - изменение статуса
- `complete` - завершение
- `error` - ошибка

**Класс SSEManager:**
```typescript
class SSEManager {
  subscribe(sessionId: string, res: Response): void;
  unsubscribe(sessionId: string, res: Response): void;
  emit(sessionId: string, event: string, data: unknown): void;
  log(sessionId: string, message: string, level?: 'info' | 'warn' | 'error'): void;
  progress(sessionId: string, current: number, total: number, message?: string): void;
  status(sessionId: string, status: string, details?: unknown): void;
  complete(sessionId: string, result: unknown): void;
  error(sessionId: string, errorMsg: string): void;
}
```

---

### 5. Auth Routes (auth.routes.ts)

**Файл:** [`src/routes/auth.routes.ts`](a2a-server/src/routes/auth.routes.ts)

**Endpoints:**

| Method | Path | Назначение |
|--------|------|------------|
| POST | `/api/v1/auth/register` | Регистрация клиента |
| POST | `/api/v1/auth/token` | Получение токена |
| POST | `/api/v1/auth/refresh` | Обновление токена |
| GET | `/api/v1/auth/me` | Информация о текущем клиенте |

---

### 6. Health Routes (health.routes.ts)

**Файл:** [`src/routes/health.routes.ts`](a2a-server/src/routes/health.routes.ts)

**Endpoints:**

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/api/v1/health` | Полный health check |
| GET | `/api/v1/health/live` | Liveness probe |
| GET | `/api/v1/health/ready` | Readiness probe |
| GET | `/api/v1/health/database` | Статус БД |

---

## Services

### 1. Request Processor Service

**Файл:** [`src/services/request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts)

**Назначение:**
- Центральный сервис обработки запросов
- Управление фазами обработки (PhaseMachine)
- Распознавание сущностей
- Активация нейронов
- Интеграция с Action системой

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `processOneRequest()` | Обработка одного pending запроса |
| `startProcessor(intervalMs?)` | Запуск таймера обработки |
| `stopProcessor()` | Остановка процессора |

**Фазы обработки (PhaseMachine):**
1. `idle` → начальное состояние
2. `discovery` → определение фреймворков
3. `recognition` → распознавание сущностей
4. `analysis` → анализ графа
5. `action` → активация нейронов
6. `validation` → проверка результатов
7. `completed` → завершение

**Action Flow (no-ai режим):**
1. `task_request` → поиск matching action
2. `approve_action` → начало выполнения
3. `step_result` → обработка результата шага

**Взаимодействие:**
- [`request.service.ts`](a2a-server/src/services/request.service.ts) - CRUD запросов
- [`phase-machine.service.ts`](a2a-server/src/services/phase-machine.service.ts) - управление фазами
- [`context-manager.service.ts`](a2a-server/src/services/context-manager.service.ts) - управление контекстом
- [`action-processor.ts`](a2a-server/src/actions/action-processor.ts) - обработка actions
- [`entity-recognizer.service.ts`](a2a-server/src/services/entity-recognizer.service.ts) - распознавание сущностей
- [`graph-store.service.ts`](a2a-server/src/services/graph-store.service.ts) - работа с графом

---

### 2. Request Service

**Файл:** [`src/services/request.service.ts`](a2a-server/src/services/request.service.ts)

**Назначение:**
- CRUD операции для requests в БД
- Управление статусами запросов
- Очередь pending запросов

**Основные методы:**

| Метод | Входные данные | Выходные данные |
|-------|----------------|-----------------|
| `create(data)` | `CreateRequestData` | `{ promiseId, id }` |
| `getStatus(promiseId)` | `string` | `RequestStatus \| null` |
| `getResult(promiseId)` | `string` | `RequestResult \| null` |
| `getNextPending()` | - | `RequestResult \| null` |
| `updateStatus(promiseId, status, result?)` | `string, RequestStatus, object?` | `boolean` |
| `cancel(promiseId)` | `string` | `boolean` |
| `cancelAllPending()` | - | `{ cancelledCount }` |
| `getQueueLength()` | - | `number` |

**Статусы запросов:**
- `pending` - ожидает обработки
- `processing` - в обработке
- `completed` - завершен
- `failed` - ошибка
- `cancelled` - отменен

**Взаимодействие:**
- Prisma Client - ORM для PostgreSQL

---

### 3. Message Service

**Файл:** [`src/services/message.service.ts`](a2a-server/src/services/message.service.ts)

**Назначение:**
- CRUD операции для сообщений
- История сообщений сессии
- Пагинация и кэширование

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `create(data)` | Создание сообщения |
| `getById(messageId)` | Получение по ID |
| `getBySession(sessionId, options)` | Список сообщений сессии |
| `update(messageId, data)` | Обновление сообщения |
| `getByPromiseId(promiseId)` | Получение по promiseId |

**Типы сообщений (Prisma):**
- `INBOUND` - входящие от клиента
- `OUTBOUND` - исходящие от сервера

**Статусы:**
- `sent` - отправлено
- `delivered` - доставлено
- `read` - прочитано

---

### 4. Phase Machine Service

**Файл:** [`src/services/phase-machine.service.ts`](a2a-server/src/services/phase-machine.service.ts)

**Назначение:**
- Управление фазами обработки запроса
- State machine для сложных сценариев
- Контроль переходов между фазами

**Фазы:**

| Фаза | Описание | Таймаут | Max итераций |
|------|----------|---------|--------------|
| `idle` | Начальное состояние | - | 1 |
| `discovery` | Определение фреймворков | 30s | 3 |
| `recognition` | Распознавание сущностей | 60s | 5 |
| `analysis` | Анализ графа | 30s | 3 |
| `action` | Активация нейронов | 60s | 10 |
| `validation` | Проверка результатов | 30s | 5 |
| `completed` | Завершение | - | 1 |

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `getCurrentPhase()` | Текущая фаза |
| `canTransitionTo(phase)` | Проверка возможности перехода |
| `transition(nextPhase, reason?)` | Выполнение перехода |
| `autoTransition(result)` | Автоматический переход |

**Взаимодействие:**
- [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts) - основной пользователь

---

### 5. Context Manager Service

**Файл:** [`src/services/context-manager.service.ts`](a2a-server/src/services/context-manager.service.ts)

**Назначение:**
- Управление контекстом запроса
- Политики удержания данных (retention policies)
- Eviction при превышении лимита памяти

**Типы контекста:**

| Тип | Приоритет | Retention | Описание |
|-----|-----------|-----------|----------|
| `task` | 4 | permanent | Описание задачи |
| `graph` | 4 | session | Граф знаний (max 50KB) |
| `frameworks` | 3 | session | Фреймворки проекта |
| `entities` | 3 | current-task | Распознанные сущности |
| `questions` | 2 | until-fixed | Вопросы к клиенту |
| `request_files` | 2 | until-fixed | Запрошенные файлы |
| `activated_neurons` | 3 | current-task | Активированные нейроны |
| `style` | 1 | session | Стиль кода |
| `errors` | 3 | until-fixed | Ошибки обработки |
| `history` | 1 | session | История (max 10KB) |

**Retention Policies:**
- `permanent` - не удаляется
- `session` - живет в течение сессии
- `current-task` - для текущей задачи
- `until-fixed` - пока не решено

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `set(type, data)` | Установка контекста |
| `get<T>(type)` | Получение контекста |
| `has(type)` | Проверка наличия |
| `delete(type)` | Удаление |
| `getAll()` | Весь контекст |
| `getForPhase(phase)` | Контекст для фазы |
| `getStats()` | Статистика |

**Взаимодействие:**
- [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts) - основной пользователь
- [`phase-machine.service.ts`](a2a-server/src/services/phase-machine.service.ts) - контекст по фазам

---

### 6. LLM Adapter

**Файл:** [`src/services/llm-adapter.ts`](a2a-server/src/services/llm-adapter.ts)

**Назначение:**
- Интеграция с внешними LLM (OpenAI, Ollama)
- Fallback на placeholder при недоступности

**Поддерживаемые провайдеры:**
- `openai` - OpenAI API
- `ollama` - Ollama через ai-integration
- `placeholder` - заглушка

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `callLLM(input)` | Вызов LLM с контекстом |

**Входные данные:**
```typescript
interface LLMInput {
  context: Record<string, unknown>;
  injectedContent: string;
  requestFiles?: string[];
}
```

**Конфигурация (env):**
- `LLM_PROVIDER` - выбор провайдера (`openai`, `ollama`)
- `OPENAI_API_KEY` - ключ OpenAI
- `OPENAI_MODEL` - модель (default: `gpt-4o-mini`)
- `OLLAMA_MODEL` - модель Ollama (default: `qwen3:8b`)

**Взаимодействие:**
- [`ollama-adapter.ts`](a2a-server/src/services/ollama-adapter.ts) - promise-based Ollama

---

### 7. Ollama Adapter

**Файл:** [`src/services/ollama-adapter.ts`](a2a-server/src/services/ollama-adapter.ts)

**Назначение:**
- Promise-based интеграция с ai-integration (Ollama)
- Polling статуса promise

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `createOllamaPromise(request)` | Создание promise |
| `getPromiseStatus(promiseId)` | Получение статуса |
| `getPromiseResponse(promiseId)` | Получение результата |
| `waitForPromise(promiseId, onProgress?)` | Ожидание с polling |

**Конфигурация (env):**
- `AI_HUB_URL` - URL ai-integration (default: `http://localhost:11434`)
- `POLL_INTERVAL_MS` - интервал polling (default: 2000ms)
- `POLL_TIMEOUT_MS` - таймаут (default: 120000ms)

**Статусы promise:**
- `pending` - в обработке
- `done` - завершен
- `error` - ошибка

---

### 8. Invoke Service

**Файл:** [`src/services/invoke.service.ts`](a2a-server/src/services/invoke.service.ts)

**Назначение:**
- Парсинг контекста из входящих запросов
- Создание requests через requestService

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `invoke(clientId, input)` | Основной метод инвокации |

**Поддерживаемые поля входных данных:**
- `context` - контекстный блок
- `task` - описание задачи
- `message` - сообщение
- `action` - тип действия (`task_request`, `approve_action`, `step_result`)
- `selectedAction` - выбранный action
- `stepId` - ID шага
- `stepResult` - результат шага
- `code_blocks` - кодовые блоки

**Взаимодействие:**
- [`context-parser.ts`](a2a-server/src/protocol/context-parser.ts) - парсинг контекста
- [`request.service.ts`](a2a-server/src/services/request.service.ts) - создание запроса

---

## Actions

### 1. Action Executor

**Файл:** [`src/actions/action-executor.ts`](a2a-server/src/actions/action-executor.ts)

**Назначение:**
- Выполнение итеративных шагов actions
- Управление состоянием выполнения по sessionId
- Хранение истории выполнения

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `initializeExecution(sessionId, action)` | Инициализация выполнения |
| `getExecutionState(sessionId)` | Получение состояния |
| `getCurrentStep(action, state)` | Текущий шаг |
| `executeStep(sessionId, action, input)` | Выполнение шага |
| `advanceToNextStep(sessionId)` | Переход к следующему шагу |
| `completeExecution(sessionId)` | Завершение выполнения |
| `getNextSteps(action, state)` | Получение следующих шагов |
| `cancelExecution(sessionId)` | Отмена выполнения |

**Структура состояния (ExecutionState):**
```typescript
interface ExecutionState {
  actionId: string;
  currentStepIndex: number;
  history: StepHistory[];
}
```

**Структура результата шага (StepResult):**
```typescript
interface StepResult {
  stepId: string;
  status: 'completed' | 'failed';
  result: unknown;
  nextStepAvailable: boolean;
  nextStep?: SubAction;
}
```

---

### 2. Action Registry

**Файл:** [`src/actions/action-registry.ts`](a2a-server/src/actions/action-registry.ts)

**Назначение:**
- Загрузка actions из MD и YAML файлов
- Поиск actions по описанию задачи
- Keyword-based matching

**Поддерживаемые форматы:**
- **YAML** (приоритет): `src/actions/definitions/yaml/actions/*.yaml`
- **MD** (legacy): `src/actions/definitions/*.md`

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `loadFromDirectory(dirPath?)` | Загрузка всех actions |
| `getAction(id)` | Получение по ID |
| `getAllActions()` | Все loaded actions |
| `findAction(taskDescription)` | Поиск по описанию |

**Алгоритм matching:**
1. Разбиение описания на слова (мин. 3 символа)
2. Поиск совпадений в `triggers` action
3. Расчет `matchScore` (0-1)
4. Фильтрация по `MIN_MATCH_SCORE` (0.5)
5. Сортировка по убыванию score

**Взаимодействие:**
- [`action-parser.ts`](a2a-server/src/actions/action-parser.ts) - парсинг MD actions
- [`dsl/index.ts`](a2a-server/src/actions/dsl/index.ts) - парсинг YAML actions

---

### 3. Action Processor

**Файл:** [`src/actions/action-processor.ts`](a2a-server/src/actions/action-processor.ts)

**Назначение:**
- Обработка action-based запросов (no-ai режим)
- Интеграция ActionService с request processor
- Формирование ответов для клиента

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `processTaskRequest(sessionId, taskDescription)` | Обработка `task_request` |
| `processStepResult(sessionId, stepId, result)` | Обработка `step_result` |
| `approveAction(sessionId, actionId)` | Обработка `approve_action` |
| `completeExecution(sessionId)` | Завершение выполнения |

**Форматы ответов:**

**action_proposal** (task_request):
```typescript
{
  context: ContextBlock;
  execute: {
    form: {
      title: string;
      choices: Array<{ id: string; label: string }>;
    }
  }
}
```

**action_executing** (approve_action):
```typescript
{
  context: ContextBlock;
  execute: {
    script: {
      input: Record<string, unknown>;
      output: string;
      code: string;
    }
  };
  executingAction: { actionId: string; title: string; ... };
  nextSteps: Array<{ actionId: string; title: string }>;
}
```

**Взаимодействие:**
- [`action-service.ts`](a2a-server/src/actions/action-service.ts) - бизнес-логика
- [`action-executor.ts`](a2a-server/src/actions/action-executor.ts) - выполнение шагов

---

### 4. Action Service

**Файл:** [`src/actions/action-service.ts`](a2a-server/src/actions/action-service.ts)

**Назначение:**
- Фасад для интеграции ActionRegistry и ActionExecutor
- Единая точка входа для работы с actions

**Основные методы:**

| Метод | Назначение |
|-------|------------|
| `initialize()` | Загрузка actions |
| `findActions(taskDescription)` | Поиск actions |
| `getAction(actionId)` | Получение по ID |
| `startExecution(sessionId, actionId)` | Начало выполнения |
| `executeCurrentStep(sessionId, input?)` | Выполнение шага |
| `getExecutionStatus(sessionId)` | Статус выполнения |
| `completeExecution(sessionId)` | Завершение |
| `cancelExecution(sessionId)` | Отмена |

**Взаимодействие:**
- [`action-registry.ts`](a2a-server/src/actions/action-registry.ts) - поиск actions
- [`action-executor.ts`](a2a-server/src/actions/action-executor.ts) - выполнение

---

### 5. Types (Action Types)

**Файл:** [`src/actions/types.ts`](a2a-server/src/actions/types.ts)

**Основные типы:**

```typescript
// Определение action
interface ActionDefinition {
  id: string;
  title: string;
  description: string;
  priority: number;
  triggers?: string[];
  context: ActionContext;
  subActions: SubAction[];
}

// Под-действие (шаг)
interface SubAction {
  id: string;
  title: string;
  description: string;
  priority: number;
  input: string;
  output: string;
  dsl: DSLDefinition;
  code?: string;
}

// DSL определение
interface DSLDefinition {
  script: string;
  input: Record<string, unknown>;
}

// Контекст action
interface ActionContext {
  framework?: string;
  buildTool?: string;
  aliases?: Record<string, string>;
}

// Результат matching
interface ActionMatch {
  action: ActionDefinition;
  matchScore: number;
}

// Outcome types
export type ActionOutcome = 
  | 'action_proposal' 
  | 'action_executing' 
  | 'completed' 
  | 'failed';
```

---

## Диаграмма взаимодействия компонентов

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ROUTES                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  /invoke  /requests  /actions  /sse  /auth  /health                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         INVOKE SERVICE                                  │
│                    (парсинг контекста, создание запроса)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        REQUEST SERVICE                                  │
│                     (CRUD, очередь, БД)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     REQUEST PROCESSOR SERVICE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ PhaseMachine │  │ContextManager│  │ActionProcessr│  │  Neurons    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
│  Flow: idle → discovery → recognition → analysis → action → completed   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ ActionService│  │EntityRecogniz│  │  LLM Adapter │
        │  ┌────────┐  │  │    -er       │  │              │
        │  │Registry│  │  └──────────────┘  │  ┌──────────┐│
        │  │Executor│  │                    │  │  OpenAI  ││
        │  └────────┘  │                    │  │  Ollama  ││
        └──────────────┘                    │  └──────────┘│
                                            └──────────────┘
```

---

## Поток обработки запроса

### 1. AI-режим (с LLM)

```
Client → POST /invoke → InvokeService → RequestService (create)
                                              │
                                              ▼
RequestProcessor (timer) → getNextPending() → PhaseMachine
                                    │
                                    ├── discovery: extractFrameworks()
                                    ├── recognition: recognizeEntitiesBatch()
                                    ├── analysis: isGraphComplete()
                                    ├── action: activateNeurons()
                                    └── validation: generateQuestions()
                                              │
                                              ▼
                                    RequestService.updateStatus()
                                              │
                                              ▼
                                    Client ← GET /requests/:id/result
```

### 2. No-AI режим (Actions)

```
Client → POST /invoke (task_request) → ActionProcessor.processTaskRequest()
                                              │
                                              ├── ActionRegistry.findAction()
                                              └── Return: action_proposal
                                              │
Client ← execute.form.choices (выбор action)
  │
  ▼
POST /invoke (approve_action) → ActionProcessor.approveAction()
                                              │
                                              ├── ActionService.startExecution()
                                              └── Return: action_executing
                                              │
Client ← execute.script (код для выполнения)
  │
  ▼
POST /invoke (step_result) → ActionProcessor.processStepResult()
                                              │
                                              ├── ActionService.executeCurrentStep()
                                              └── Return: action_executing / completed
```

---

## Конфигурация (Environment Variables)

### Основные
- `PORT` - порт сервера (default: 3000)
- `DATABASE_URL` - URL PostgreSQL
- `JWT_SECRET` - секрет для JWT
- `ENCRYPTION_KEY` - ключ шифрования (32 chars)

### LLM
- `LLM_PROVIDER` - провайдер (`openai`, `ollama`)
- `OPENAI_API_KEY` - ключ OpenAI
- `OPENAI_MODEL` - модель OpenAI
- `OLLAMA_MODEL` - модель Ollama
- `AI_HUB_URL` - URL ai-integration

### Processor
- `REQUEST_PROCESSOR_INTERVAL_MS` - интервал polling (default: 5000ms)

### Auth
- `SKIP_AUTH=1` - пропуск аутентификации (dev)
