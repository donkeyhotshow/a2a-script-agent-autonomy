# API Client Documentation

> **⚠️ Важно:** Это документация для обновлённой системы.
>
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md)
>
> **Note:** Legacy **`@a2a/api-client`** — в **`@a2a/sdk`**. Используйте:
> ```typescript
> import { ApiClient } from '@a2a/sdk/client';
> ```

## Обзор

API Client (`a2a-client/packages/sdk`) — это HTTP-клиент для взаимодействия с A2A Server (порт 3000). Он используется Client API Server для отправки запросов к основному серверу.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                      API CLIENT                                   │
│                 (@a2a/sdk)                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ApiClient                                                 ││
│  │  - request()          - низкоуровневые HTTP запросы       ││
│  │  - createSession()    - создание сессии                    ││
│  │  - sendMessage()     - отправка сообщения                 ││
│  │  - continueSession() - продолжение сессии                  ││
│  │  - confirmSession()  - подтверждение                       ││
│  │  - invoke()          - общий вызов                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌───────────────────────────┴────────────────────────────────┐│
│  │  AsyncApiClient                                             ││
│  │  - Обработка асинхронных ответов с promiseId              ││
│  │  - PromisePoller для опроса результатов                    ││
│  │  - executeAction() - выполнение действий с шагами         ││
│  │  - runSessionWithRAG() - сессия с RAG поиском              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌───────────────────────────┴────────────────────────────────┐│
│  │  action-handler.ts                                          ││
│  │  - handleActionResponse() - обработка ответов действий      ││
│  │  - createExecuteCode()   - создание адаптера для скриптов  ││
│  │  - hasFormChoices()      - проверка наличия формы выбора   ││
│  │  - extractFormChoices()  - извлечение вариантов формы       ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌───────────────────────────┴────────────────────────────────┐│
│  │  protocol.ts                                                ││
│  │  - buildNewTaskContext()    - контекст новой задачи        ││
│  │  - buildContinueContext()   - контекст продолжения          ││
│  │  - buildConfirmContext()    - контекст подтверждения        ││
│  │  - serializeFileBlock()     - сериализация файлов          ││
│  │  - parseMessage()           - парсинг сообщений             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Основные файлы

| Файл | Назначение |
|------|------------|
| [`src/index.ts`](../../a2a-client/packages/sdk/src/index.ts) | Главный экспорт, класс ApiClient |
| [`src/async-client.ts`](../../a2a-client/packages/sdk/src/async-client.ts) | Асинхронный клиент с PromisePoller |
| [`src/protocol.ts`](../../a2a-client/packages/sdk/src/protocol.ts) | Утилиты протокола для контекста |
| [`src/action-handler.ts`](../../a2a-client/packages/sdk/src/action-handler.ts) | Обработчики действий |

## ApiClient

### Конструктор

```typescript
import {ApiClient} from '@a2a/sdk';

const client = new ApiClient({
    serverUrl?: string;    // По умолчанию: http://localhost:3000/api/v1
    token?: string;        // JWT токен
    clientId?: string;     // ID клиента
    timeout?: number;      // Таймаут в мс (по умолчанию: 30000)
});
```

### Методы

#### request()

Низкоуровневый метод для выполнения HTTP запросов.

```typescript
const result = await client.request(
    method: string,        // GET, POST, PUT, DELETE, PATCH
    path: string,          // Путь (напр., /sessions)
    body?: Record<string, unknown> | null  // Тело запроса
): Promise<Record<string, unknown>>;
```

#### createSession()

Создаёт новую сессию на сервере.

```typescript
const session = await client.createSession(projectId: string): Promise<{
    session_id: string;
    // ...другие поля
}>;
```

#### sendMessage()

Отправляет сообщение (задачу) в сессию.

```typescript
const response = await client.sendMessage(
    sessionId: string,
    newTask: string[],                           // Массив задач
    architecturalFeatures?: string[]            // Архитектурные особенности
): Promise<Record<string, unknown>>;
```

#### continueSession()

Продолжает сессию с результатом предыдущего шага.

```typescript
const response = await client.continueSession(
    sessionId: string
): Promise<Record<string, unknown>>;
```

#### confirmSession()

Подтверждает сессию (например, после выбора действия из формы).

```typescript
const response = await client.confirmSession(
    sessionId: string,
    files?: FileBlockLike[]  // Файлы для подтверждения
): Promise<Record<string, unknown>>;
```

#### sendFiles()

Отправляет файлы в сессию.

```typescript
const response = await client.sendFiles(
    sessionId: string,
    files: FileBlockLike[]
): Promise<Record<string, unknown>>;
```

#### getSession()

Получает информацию о сессии.

```typescript
const session = await client.getSession(sessionId: string): Promise<{
    // ...данные сессии
}>;
```

#### getSessionContext()

Получает контекст сессии.

```typescript
const context = await client.getSessionContext(sessionId: string): Promise<{
    // ...контекст сессии
}>;
```

#### deleteSession()

Удаляет сессию.

```typescript
await client.deleteSession(sessionId: string): Promise<void>;
```

#### invoke()

Общий метод для вызова с произвольным markdown. На сервер уходит **`POST /api/v1/invoke`** (SDK проксирует).

```typescript
const result = await client.invoke({
    markdown: string,                          // Markdown описание задачи
    context?: Record<string, unknown>;         // Дополнительный контекст
    files?: FileBlockLike[];                   // Файлы
}): Promise<Record<string, unknown>>;
```

**Формат запроса соответствует схеме:** [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json)

#### createCard() / createCardByProject()

Создаёт карточку (задачу) для проекта.

```typescript
// Через объект card
const card = await client.createCard({
    projectId: string,
    userRequest?: { original?: string };
    request?: { raw?: string };
    architecturalFeatures?: string[];
});

// Или прямая версия
const card = await client.createCardByProject(
    projectId: string,
    userRequest: string | string[],
    architecturalFeatures?: string[]
);
```

## AsyncApiClient

Асинхронный клиент для обработки ответов с `promiseId`. Используется для:

- Длительных операций с опросом статуса
- Выполнения действий с несколькими шагами
- Сессий с RAG-поиском

### Конструктор

```typescript
import {AsyncApiClient} from '@a2a/sdk/client';

const asyncClient = new AsyncApiClient({
    serverUrl?: string;
    token?: string;
    clientId?: string;
    timeout?: number;
    polling?: {
        interval?: number;      // Интервал опроса (по умолчанию: 5000ms)
        maxAttempts?: number;   // Макс. попыток (по умолчанию: 720)
    };
});
```

### PromisePoller

Класс для управления опросом результатов асинхронных запросов.

```typescript
const poller = asyncClient.poller;

// Запуск опроса
poller.start(promiseId, {
    onStatus?: (status) => void,      // При изменении статуса
    onComplete?: (result) => void,    // При завершении
    onError?: (error) => void;        // При ошибке
});

// Остановка опроса
poller.stop(promiseId);

// Остановка всех опросов
poller.stopAll();
```

### Основные методы AsyncApiClient

#### waitForResult()

Ожидание результата с автоматическим polling.

```typescript
const result = await asyncClient.waitForResult(
    promiseId: string,
    callbacks?: {
        onStatus?: (status) => void;
        onComplete?: (result) => void;
        onError?: (error) => void;
    }
): Promise<unknown>;
```

#### createRequest()

Создание запроса на сервере.

```typescript
const {promiseId, requestId, status} = await asyncClient.createRequest({
    context?: Record<string, unknown>;
    message?: string;
    codeBlocks?: Array<{path: string; content: string}>;
    sessionId?: string;
});
```

#### getRequestStatus()

Получение статуса запроса.

```typescript
const status = await asyncClient.getRequestStatus(promiseId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    // ...другие поля
}>;
```

#### getRequestResult()

Получение результата запроса.

```typescript
const result = await asyncClient.getRequestResult(promiseId: string): Promise<unknown>;
```

#### cancelRequest()

Отмена запроса.

```typescript
await asyncClient.cancelRequest(promiseId: string): Promise<unknown>;
```

#### executeAction()

Выполнение действия с несколькими шагами. Поддерживает новый формат (`execute."script"`).

```typescript
const result = await asyncClient.executeAction(
    {
        task: string | string[],
        sessionId: string,
        scriptRunner?: {
            execute: (code: string, context: Record<string, unknown>) => Promise<unknown>;
        };
        projectPath?: string;
    },
    {
        onStep?: (step, result) => void;     // При выполнении каждого шага
        onStatus?: (status) => void;        // При изменении статуса
        onComplete?: (result) => void;      // При завершении
        onError?: (error) => void;          // При ошибке
    }
): Promise<unknown>;
```

#### runSessionWithRAG()

Выполнение сессии с RAG-поиском. Автоматически загружает релевантные файлы на основе вопросов от сервера.

```typescript
const result = await asyncClient.runSessionWithRAG(
    {
        projectPath: string;
        task?: string;
        rag?: {
            searcher: {
                search: (query: string, opts: {limit: number}) => Promise<Array<{
                    chunk: {filePath: string};
                }>>;
            };
        };
        maxIterations?: number;
    },
    {
        onIteration?: (n, result) => void;
        onStatus?: (status) => void;
        onComplete?: (result) => void;
    }
): Promise<unknown>;
```

#### continueAction()

Продолжение действия после выполнения шага.

```typescript
const result = await asyncClient.continueAction(
    sessionId: string,
    stepId: string,
    stepResult: unknown,
    callbacks?: PollCallbacks
): Promise<unknown>;
```

## Protocol Utilities

Модуль [`protocol.ts`](../../a2a-client/packages/sdk/src/protocol.ts) предоставляет утилиты для построения контекста:

```typescript
import {
    buildNewTaskContext,
    buildContinueContext,
    buildConfirmContext,
    buildFileResponseContext,
    serializeFileBlock,
    parseFileBlock,
    parseMessage,
    type FileBlockLike,
} from '@a2a/sdk/client';
```

### buildNewTaskContext()

Создаёт контекст для новой задачи.

```typescript
const context = buildNewTaskContext(
    sessionId: string,
    tasks: string[],
    architecturalFeatures?: string[]
);
// Результат: { version: '1.0', session_id: '...', new_task: [...] }
```

### buildContinueContext()

Создаёт контекст для продолжения сессии.

```typescript
const context = buildContinueContext(sessionId: string);
// Результат: { version: '1.0', session_id: '...', continue: true }
```

### buildConfirmContext()

Создаёт контекст для подтверждения.

```typescript
const context = buildConfirmContext(sessionId: string);
// Результат: { version: '1.0', session_id: '...', confirm: true }
```

### buildFileResponseContext()

Создаёт контекст для отправки файлов.

```typescript
const context = buildFileResponseContext(sessionId: string);
// Результат: { version: '1.0', session_id: '...' }
```

### serializeFileBlock()

Сериализует файл в markdown-подобный формат.

```typescript
const serialized = serializeFileBlock('src/app.ts', 'const x = 1;', 1, 10);
// Результат: '```file:src/app.ts:1-10\nconst x = 1;\n```'
```

### parseFileBlock()

Парсит сериализованный файл обратно.

```typescript
const parsed = parseFileBlock('```file:src/app.ts:1-10\nconst x = 1;\n```');
// Результат: { path: 'src/app.ts', content: 'const x = 1;', startLine: 1, endLine: 10 }
```

### parseMessage()

Парсит полное сообщение с контекстом и файлами.

```typescript
const parsed = parseMessage('```context\n{"session_id": "abc"}\n```\n\n```file:test.js\nconst x = 1;\n```');
// Результат: { context: {session_id: 'abc'}, files: [{path: 'test.js', content: 'const x = 1;'}] }
```

## Action Handler

Модуль [`action-handler.ts`](../../a2a-client/packages/sdk/src/action-handler.ts) обрабатывает ответы действий:

```typescript
import {
    handleActionResponse,
    createExecuteCode,
    hasFormChoices,
    extractFormChoices,
} from '@a2a/sdk/client';
```

### handleActionResponse()

Обрабатывает ответ от действия. Поддерживает новый формат (`execute."script").

```typescript
const result = await handleActionResponse(
    response: {
        action?: { currentStep?: { id?: string; code?: string } };
        execute?: { script?: { code?: string } };
        context?: { session_id?: string };
    },
    options: {
        executeCode: (code: string, context: Record<string, unknown>) => Promise<unknown>;
        sendContinue: (sessionId: string, stepId: string, stepResult: unknown) => Promise<unknown>;
        projectPath?: string;
        previousOutput?: unknown;
    }
): Promise<{
    handled: boolean;          // Был ли обработан
    stepResult?: unknown;      // Результат выполнения
    nextResponse?: unknown;    // Следующий ответ
    error?: string;            // Ошибка при обработке
}>;
```

### createExecuteCode()

Создаёт адаптер для функции выполнения скриптов. Используется для интеграции с `@a2a/execution`.

```typescript
const executeCode = createExecuteCode(
    executeScript: (
        code: string,
        input: Record<string, unknown>,
        context: { workingDir?: string; sessionId?: string; stepId?: string }
    ) => Promise<{success: boolean; data?: unknown; error?: string}>
);

// Использование с handleActionResponse
await handleActionResponse(response, {
    executeCode,
    sendContinue: async (sessionId, stepId, result) => {...}
});
```

### hasFormChoices()

Проверяет, содержит ли ответ варианты формы выбора (новый формат протокола).

```typescript
if (hasFormChoices(response)) {
    // Ответ содержит execute.form.choices
}
```

### extractFormChoices()

Извлекает варианты формы выбора из ответа.

```typescript
const choices = extractFormChoices(response);
// Результат: Array<{id: string; label: string}>
```

## Форматы запросов и ответов

API Client работает с форматами, определёнными в JSON схемах:

### Server Invoke Request

Тело запроса к **`POST /api/v1/invoke`** соответствует схеме [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json):

```typescript
// Первый запрос
await client.invoke({
    markdown: 'task description',
    context: {},
    files: []
});

// Последующие запросы
await client.invoke({
    markdown: undefined, // Не используется после первого запроса
    context: { /* контекст от предыдущего ответа */ },
    result: { choice: 'selected-action-id' } // или result.message для форм с вводом
});
```

Обратите внимание: в последующих запросах `context` уже содержит `task` и `execution` (action + step), потому что именно клиент первым сохраняет текущий контекст перед отправкой. Сервер валидирует, что `context` включает эти поля — `result` добавляется только если есть новый выбор/ответ/данные (см. [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json)). Поля `projectId`/`sessionId` остаются в клиентской памяти и не попадают в тело запроса.

### Server Invoke Response

Ответы сервера могут быть трёх типов:

1. **First Form** — выбор действия из списка
   - Соответствует: [`server-invoke-response-first-form.schema.json`](json-schemas/server-invoke-response-first-form.schema.json)
   - Структура: `{ context: {task}, execute: { form: { choices: [...] } } }`

2. **Execute** — выполнение действия (шаг)
   - Соответствует: [`server-invoke-response-execute.schema.json`](json-schemas/server-invoke-response-execute.schema.json)
   - Структура: `{ context: {execution}, execute: { script: {...} } }`

3. **Pending** — асинхронная обработка (promiseId)
   - Соответствует: [`server-invoke-response-pending.schema.json`](json-schemas/server-invoke-response-pending.schema.json)
   - Структура: `{ promiseId, status: 'pending' }`

### Action-Key Shape

Важно: Все `result` и `execute` объекты должны использовать **action-key shape** (см. [PROTOCOL.md](PROTOCOL.md)):

```json
// ✅ Правильно:
{ "result": { "script": { "output": "..." } } }
{ "execute": { "read-file": { "path": "..." } } }

// ❌ Неправильно:
{ "result": { "content": "..." } }
```

## Интеграция с симуляциями

API Client используется в симуляциях для:

1. **Воспроизведения** — отправка запросов в соответствии со схемой симуляции
2. **Верификации** — сравнение ответов с ожидаемыми результатами

### Пример использования в симуляции

```typescript
import {ApiClient} from '@a2a/sdk';

const client = new ApiClient({serverUrl: 'http://localhost:3000/api/v1'});

// Первый запрос (задача)
const response1 = await client.invoke({
    markdown: 'fix vue imports in components'
});

// Проверка: сервер вернул форму выбора
if (hasFormChoices(response1)) {
    const choices = extractFormChoices(response1);
    // Выбор первого действия
    const response2 = await client.invoke({
        context: response1.context,
        result: { choice: choices[0].id }
    });
}

// Выполнение шагов (для Actions)
const result = await asyncClient.executeAction(
    { task: 'fix vue imports', sessionId: 'sess_123' },
    {
        onStep: async (step, result) => {
            // Выполнить код шага
            console.log(`Executing step: ${step.id}`);
        }
    }
);
```

См. [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) для деталей о формате симуляций.

## Обработка ошибок

```typescript
import {ApiClient, ApiError} from '@a2a/sdk/client';

try {
    const result = await client.invoke({markdown: 'some task'});
} catch (error) {
    if (error instanceof ApiError) {
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Data:', error.data);
    }
}
```

### Типы ошибок PromisePoller

```typescript
// При опросе могут возникать ошибки:
- 'Request failed'          // Запрос не выполнен
- 'Request was cancelled'   // Запрос отменён
- 'Polling timeout exceeded' // Превышен таймаут опроса
```

## Перекрёстные ссылки

- [ARCHITECTURE.md](ARCHITECTURE.md) — Общая архитектура системы
- [PROTOCOL.md](PROTOCOL.md) — Протокол взаимодействия (action-key shape, типы действий)
- [SESSION-FLOW.md](SESSION-FLOW.md) — Поток сессий (состояния, этапы)
- [SCHEMAS.md](SCHEMAS.md) — JSON схемы
- [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) — Формат симуляций
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) — Схема симуляций (canonical)
- [WEB-UI.md](WEB-UI.md) — Web UI
- [API-SERVER.md](API-SERVER.md) — Client API Server
- [DATA-FLOW.md](DATA-FLOW.md) — Полная диаграмма потока данных
- [json-schemas](json-schemas/) — JSON схемы запросов/ответов
  - `server-invoke-request.schema.json`
  - `server-invoke-response-execute.schema.json`
  - `server-invoke-response-first-form.schema.json`
  - `server-invoke-response-pending.schema.json`

## Зависимости

API Client использует:

- `node-fetch` — для HTTP запросов
- `@a2a/execution` (опционально) — для выполнения кода в sandbox
- `@a2a/rag` (опционально) — для RAG-поиска
