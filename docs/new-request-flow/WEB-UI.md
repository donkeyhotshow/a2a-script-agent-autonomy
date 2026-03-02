# Web UI Documentation

> **⚠️ Важно:** Это документация для обновлённой системы. Старые файлы Web UI больше не поддерживаются.
> 
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md)

## Обзор

Web UI (`a2a-client/web`) — это пользовательский интерфейс для взаимодействия с системой A2A. Он работает в браузере и общается **только** с Client API (порт 3001), не обращаясь напрямую к серверу (порт 3000).

## Архитектура Web UI

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEB UI (a2a-client/web)                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  app-boot.js                                                ││
│  │  - Главная точка входа (6 фаз инициализации)                 ││
│  │  - Инициализация в правильном порядке                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌──────────────┬───────────┴────────────┬──────────────────┐  │
│  │ app-init.js  │   sessions.js         │ actions-manager  │  │
│  │ (инициализ.) │   (управление сессиями)│ (управление     │  │
│  └──────────────┴────────────────────────┴──────────────────┘  │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  web-api-client.js / api-integration.js                    ││
│  │  - HTTP клиент для Client API                                ││
│  │  - Поддержка SSE для real-time обновлений                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  flow/ - VueFlow визуализация                               ││
│  │  - panels/* - панели UI                                     ││
│  │  - protocol.js - маппинг протокола                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Точки входа (Entry Points)

| Файл | Назначение |
|------|------------|
| [`app-boot.js`](../../a2a-client/web/js/app-boot.js) | Главная точка входа, 6 фаз инициализации |
| [`app-init.js`](../../a2a-client/web/js/app-init.js) | Дополнительная инициализация |
| [`app-state.js`](../../a2a-client/web/js/app-state.js) | Центральное управление состоянием |
| [`index.html`](../../a2a-client/web/index.html) | HTML-шаблон |

### Фазы инициализации AppBoot

1. **Phase 1: Core** — `appState`, `actionsManager`, `uiManager`, `apiIntegration`
2. **Phase 2: Flow** — инициализация VueFlow
3. **Phase 3: UI Components** — UI компоненты
4. **Phase 4: Enhancements** — улучшения
5. **Phase 5: Event bindings** — привязка событий
6. **Phase 6: Restore state** — восстановление состояния |

## Как Web общается с Client API

Web UI использует [`web-api-client.js`](../../a2a-client/web/js/web-api-client.js) для всех HTTP-запросов к Client API.

### Базовый URL и конфигурация

```javascript
// По умолчанию используется относительный путь
serverUrl: '/api/v1'

// Конфигурация в app-boot.js
AppBoot = {
    config: {
        serverUrl: '/api/v1',
        useSSE: true,
        autoSave: true,
        showMinimap: true,
        theme: 'dark'
    }
}
```

### WebAPIClient

[`web-api-client.js`](../../a2a-client/web/js/web-api-client.js) предоставляет методы:

| Метод | Описание |
|-------|----------|
| `configure(options)` | Настройка клиента |
| `request(method, path, body)` | Низкоуровневый HTTP запрос |
| `createRequest(requestData)` | Создание запроса (task/message) |
| `createSession(projectId, title)` | Создание сессии |

### Основные Endpoints

#### Sessions (Управление сессиями)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/sessions` | Получить список сессий проекта |
| `POST` | `/api/sessions` | Создать новую сессию |
| `GET` | `/api/sessions/:sessionId` | Получить сессию по ID |
| `DELETE` | `/api/sessions/:sessionId` | Удалить сессию |
| `POST` | `/api/sessions/:sessionId/action` | Выбрать действие (execute form choice) |
| `POST` | `/api/sessions/:sessionId/next` | Продолжить выполнение (отправить result) |
| `POST` | `/api/sessions/:sessionId/cancel` | Отменить выполнение |

#### Projects (Управление проектами)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/projects` | Получить список проектов |
| `POST` | `/api/projects` | Создать проект |
| `DELETE` | `/api/projects/:projectId` | Удалить проект |

#### Config (Конфигурация)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/config` | Получить текущую конфигурацию |
| `POST` | `/api/config` | Сохранить конфигурацию |

#### Invoke (Прокси к серверу)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/v1/invoke` | Проксировать запрос к серверу |

#### SSE (Server-Sent Events)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/v1/sse/:sessionId` | Получить SSE поток для сессии |

## Формат запросов и ответов

### Создание сессии

```javascript
// POST /api/sessions
{
    projectId: "proj_123",
    title: "Новая сессия",
    task: "описание задачи"
}
```

Ответ:
```json
{
    "id": "sess_abc123",
    "projectId": "proj_123",
    "title": "Новая сессия",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Выбор действия (action)

```javascript
// POST /api/sessions/:sessionId/action
{
    action: "fix-vue-imports"
}
```

### Продолжение выполнения (next)

```javascript
// POST /api/sessions/:sessionId/next
{
    "result": {
        "script": {
            "output": "found 5 broken imports"
        }
    }
}
```

## Обработка execute.* типов

Web UI должен обрабатывать следующие типы `execute` ответов от сервера:

### execute.form (Интерактивные формы)

Когда сервер возвращает `execute.form`, Web UI отображает форму с выбором:

```json
{
    "execute": {
        "form": {
            "title": "Выберите действие",
            "input": [
                {
                    "name": "action",
                    "type": "select",
                    "choices": [
                        {"id": "fix-vue-imports", "label": "Исправить Vue импорты"},
                        {"id": "run-tests", "label": "Запустить тесты"}
                    ]
                }
            ]
        }
    }
}
```

### execute.message (Сообщения)

Когда сервер возвращает `execute.message`, Web UI отображает информационное сообщение:

```json
{
    "execute": {
        "message": "Все файлы успешно обработаны"
    }
}
```

### execute.script (Выполнение кода)

```json
{
    "execute": {
        "script": {
            "input": {},
            "output": "",
            "code": "// JavaScript код для выполнения"
        }
    }
}
```

### execute.read-file (Чтение файла)

```json
{
    "execute": {
        "read-file": {
            "path": "src/App.vue"
        }
    }
}
```

### execute.write-file (Запись файла)

```json
{
    "execute": {
        "write-file": {
            "path": "src/App.vue",
            "content": "..."
        }
    }
}
```

### execute.execute-command (Выполнение команды)

```json
{
    "execute": {
        "execute-command": {
            "command": "npm run build"
        }
    }
}
```

### execute.rag-search (RAG поиск)

```json
{
    "execute": {
        "rag-search": {
            "query": "как работает компонент"
        }
    }
}
```

## Состояния сессии в Web UI

Web UI отображает следующие состояния сессии (см. также [SESSION-FLOW.md](SESSION-FLOW.md)):

| Состояние | Описание |
|-----------|----------|
| `PENDING` | Сессия создана, ожидает выбора действия из `execute.form.choices` |
| `READY` | Пользователь выбрал действие, готово к выполнению |
| `IN_PROGRESS` | Выполняются шаги (steps) |
| `WAITING_CONFIRMATION` | Ожидает подтверждения от пользователя |
| `COMPLETED` | Все шаги выполнены успешно |
| `ERROR` | Ошибка при выполнении |
| `CANCELLED` | Отменена пользователем |

### Управление сессиями в Web

[`sessions.js`](../../a2a-client/web/js/sessions.js) управляет состоянием сессии:

```javascript
Sessions = {
    state: {
        list: [],              // Список сессий
        current: null,         // Текущая сессия
        projectId: null,
        messages: [],
        action: {
            definition: null,
            executionState: null,
            isRunning: false,
            approved: false,
            // Поля для execute.* протокола
            choices: [],        // execute.form.choices
            formTitle: '',
            currentStepCode: null,
            currentStepInput: {}
        }
    },
    useSSE: true,  // SSE включен по умолчанию
    pollInterval: 5000
}
```

## SSE (Server-Sent Events)

Web UI поддерживает SSE ([`sse-client.js`](../../a2a-client/web/js/sse-client.js)) для real-time обновлений:

```javascript
// Подключение к SSE
const eventSource = new EventSource('/api/v1/sse/sessionId');

// Обработка событий
eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    // Обновить UI
});

eventSource.addEventListener('error', (event) => {
    // Обработать ошибку
});
```

### Обработчики SSE в Sessions

[`sessions.js`](../../a2a-client/web/js/sessions.js) обрабатывает SSE события:

```javascript
// Подключение обработчиков
setupSSEHandlers() {
    const client = window.SSEClient;
    
    // Connected - соединение установлено
    client.on('connected', (data) => { 
        this.state.sseConnected = true; 
    });
    
    // Progress - прогресс выполнения
    client.on('progress', (data) => { 
        // Обновить UI с прогрессом
    });
    
    // Result - результат выполнения
    client.on('result', (data) => { 
        // Обработать результат
    });
    
    // Complete - завершение
    client.on('complete', (data) => { 
        // Показать завершение
    });
    
    // Error - ошибка
    client.on('error', (data) => { 
        // Обработать ошибку
    });
}
```

### Fallback: Polling

При недоступности SSE используется polling (интервал 5 секунд):

```javascript
// Конфигурация polling в web-api-client.js
polling: {
    interval: 2000,
    maxAttempts: 180 // 6 минут максимум
}
```

## Тестирование с симуляциями

См. [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) для понимания формата симуляций.

### Пример тестирования

1. Создайте симуляцию в [`simulations/`](../../simulations/)
2. Запустите сервер с симуляцией: `npm run sim:run <simulation-name>`
3. Откройте Web UI и создайте сессию
4. Сравните результаты с expected response из симуляции

## Flow UI (VueFlow)

Модуль [`flow/index.js`](../../a2a-client/web/js/flow/index.js) обеспечивает визуализацию графа выполнения:

| Компонент | Файл | Назначение |
|-----------|------|------------|
| A2AFlowManager | [`flow/index.js`](../../a2a-client/web/js/flow/index.js) | Основной контроллер VueFlow |
| Protocol | [`flow/protocol.js`](../../a2a-client/web/js/flow/protocol.js) | Маппинг A2A протокола в узлы |
| Nodes | [`flow/nodes.js`](../../a2a-client/web/js/flow/nodes.js) | Кастомные узлы VueFlow |
| SessionsPanel | [`flow/panels/sessions-panel.js`](../../a2a-client/web/js/flow/panels/sessions-panel.js) | Панель сессий |
| ActionsPanel | [`flow/panels/actions-panel.js`](../../a2a-client/web/js/flow/panels/actions-panel.js) | Панель действий |
| ChatPanel | [`flow/panels/chat-panel.js`](../../a2a-client/web/js/flow/panels/chat-panel.js) | Чат панель |
| GraphPanel | [`flow/panels/graph-panel.js`](../../a2a-client/web/js/flow/panels/graph-panel.js) | Граф панель |

#### Кастомные узлы Flow

- `TaskInputNode` — узел входных данных задачи
- `ActionProposalNode` — узел предложения действия
- `SubActionNode` — узел поддействия
- `ResultNode` — узел результата
- `ActionCompleteNode` — узел завершения

#### Flow Protocol маппинг

[`flow/protocol.js`](../../a2a-client/web/js/flow/protocol.js) преобразует ответы сервера в узлы:

```javascript
// Маппинг контекста в узлы
mapContextToFlow(context)

// Маппинг ответа симуляции
mapSimulationResponseToFlow(response)

// Создание узлов разных типов
createTaskRequestNode(data)
createTaskContextBlock(data)
createProposalContextBlock(data)
createResultContextBlock(data)
createCompleteContextBlock(data)
```

## JSON Схемы

Web UI использует схемы из [`json-schemas/`](json-schemas/):

| Схема | Назначение |
|-------|------------|
| [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json) | Формат запроса к серверу |
| [`server-invoke-response-execute.schema.json`](json-schemas/server-invoke-response-execute.schema.json) | Формат execute ответа |
| [`server-invoke-response-first-form.schema.json`](json-schemas/server-invoke-response-first-form.schema.json) | Первый ответ с form.choices |
| [`server-invoke-response-pending.schema.json`](json-schemas/server-invoke-response-pending.schema.json) | Ожидающий ответ |
| [`server-transform.schema.json`](json-schemas/server-transform.schema.json) | Трансформации сервера |

## Web → Client API → Server → External AI Hub Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          WEB UI (a2a-client/web)                       │
│                              localhost:5173                             │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│  │  TaskInput  │    │ SessionsPanel│    │ ActionsPanel│                │
│  │  (ввод задачи)│    │ (панель сессий)│   │ (панель действий)│           │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                │
│         │                  │                  │                         │
│         ▼                  ▼                  ▼                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │              web-api-client.js / api-integration.js          │      │
│  │         HTTP клиент для Client API (localhost:3001)          │      │
│  └──────────────────────────────┬──────────────────────────────┘      │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLIENT API SERVER (a2a-client)                     │
│                              localhost:3001                             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │  Роутинг: /api/sessions/*, /api/projects/*, /api/v1/*       │      │
│  └──────────────────────────────┬──────────────────────────────┘      │
│                                 │                                        │
│         ┌───────────────────────┼───────────────────────┐              │
│         ▼                       ▼                       ▼              │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │ Хранение     │    │   ApiClient     │    │  Terminal API   │      │
│  │ проектов     │    │ (прокси к серверу)│   │                 │      │
│  │ и сессий     │    │ localhost:3000  │    │                 │      │
│  └─────────────┘    └────────┬─────────┘    └─────────────────┘      │
└──────────────────────────────┼─────────────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         A2A SERVER (a2a-server)                          │
│                              localhost:3000                             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │  Endpoints: /api/v1/invoke, /api/v1/requests/*, /sse/*    │      │
│  └──────────────────────────────┬──────────────────────────────┘      │
│                                 │                                        │
│         ┌───────────────────────┼───────────────────────┐              │
│         ▼                       ▼                       ▼              │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │ Actions      │    │ Context Manager │    │  Message Service │      │
│  │ Registry     │    │ (история, state)│    │                 │      │
│  └─────────────┘    └────────┬─────────┘    └─────────────────┘      │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │ HTTP
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL AI HUB (ollama proxy)                     │
│                              localhost:11434                            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │  - Promise-based async (X-Promise header)                    │      │
│  │  - LLM inference (Ollama)                                    │      │
│  │  - Simulation mode for testing                               │      │
│  └─────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Simulations в Data Flow

Симуляции используются как **golden traces** для тестирования и верификации:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SIMULATION FLOW                                  │
│                                                                          │
│  simulations/              Server Transforms           LLM Processing  │
│  ┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐ │
│  │ request.json │─────▶│server-transforms│─────▶│   request.md     │ │
│  │              │      │  -request.json   │      │ (system prompt)  │ │
│  └──────────────┘      └──────────────────┘      └────────┬─────────┘ │
│                                                           │            │
│                                                           ▼            │
│  response.json  ◀────────server-transforms        response.md      │
│  (expected)         -response.json                 (LLM output)     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Compare: response.json (actual) vs response.json (expected) │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**См.:** [simulations/SCHEMA.md](../../simulations/SCHEMA.md), [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md)

## Перекрёстные ссылки

- [ARCHITECTURE.md](ARCHITECTURE.md) — Общая архитектура системы
- [PROTOCOL.md](PROTOCOL.md) — Протокол взаимодействия
- [SESSION-FLOW.md](SESSION-FLOW.md) — Поток сессий
- [SCHEMAS.md](SCHEMAS.md) — JSON схемы
- [api-server](API-SERVER.md) — Client API Server
- [api-client](API-CLIENT.md) — HTTP клиент для сервера
- [DATA-FLOW.md](DATA-FLOW.md) — Полная диаграмма потока данных
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) — Схема симуляций
- [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) — Формат симуляций
