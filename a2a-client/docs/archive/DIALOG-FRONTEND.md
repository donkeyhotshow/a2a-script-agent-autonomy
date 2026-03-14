# Документация по диалогу (DIALOG-FRONTEND)

## Содержание

1. [Overview](#overview)
2. [UI Компоненты](#ui-компоненты)
3. [Структура данных](#структура-данных)
4. [API Endpoints](#api-endpoints)
5. [Серверная обработка](#серверная-обработка)
6. [Симуляции](#симуляции)
7. [Протокол A2A](#протокол-a2a)
8. [Non-obvious моменты](#non-obvious-моменты)

---

## Overview

Диалог — это основной режим взаимодействия пользователя с системой A2A, при котором происходит последовательный обмен сообщениями между пользователем и AI. В отличие от классического execute-режима (где сервер выполняет действия), диалоговый режим предполагает накопление контекста и построение истории разговора.

**Ключевые характеристики диалога:**

- **Интерактивность** — сервер ожидает ввод от пользователя (message или choice)
- **Контекстная память** — история хранится на сервере в `context.history`
- **Два режима работы** — синхронный (sync) и асинхронный (async/promise)
- **Трансформы** — использует `dialog-request.json` и `dialog-response.json`

---

## UI Компоненты

Диалоговый UI состоит из нескольких ключевых модулей, каждый из которых отвечает за свой аспект работы:

### task-flow/render.js

Файл: [`a2a-client/web/js/task-flow/render.js`](a2a-client/web/js/task-flow/render.js)

Отвечает за рендеринг сообщений и формы ввода в UI:

- `renderMessageHistory(contentEl, store)` — рендерит историю сообщений
- `updateStatus(contentEl, text)` — обновляет статус выполнения
- Формирует HTML для сообщений пользователя и AI
- Обрабатывает отображение формы ввода и кнопок выбора (choices)

```javascript
// Пример структуры сообщения
{
    role: 'user' | 'assistant',
    content: 'текст сообщения',
    timestamp: '2024-01-01T00:00:00.000Z'
}
```

### task-flow/core.js

Файл: [`a2a-client/web/js/task-flow/core.js`](a2a-client/web/js/task-flow/core.js)

Ядро потока задач — координирует работу между API и рендерингом:

- Управляет переходами между шагами
- Интегрирует модули API и Render
- Определяет активную сессию и проект
- Обрабатывает результаты действий пользователя

```javascript
// Основные функции
function resolveStore(sessionId) // Получить хранилище для сессии
function getProjectId()          // Получить ID текущего проекта
```

### task-flow/api.js

Файл: [`a2a-client/web/js/task-flow/api.js`](a2a-client/web/js/task-flow/api.js)

Отвечает за HTTP-коммуникацию с сервером:

- `getApiBase()` — определяет базовый URL API
- `getHeaders()` — формирует заголовки запросов
- `request(method, path, body)` — выполняет HTTP-запросы

```javascript
// Определение базового URL
const base = storageMode === 'storage' 
    ? '/api/a2a'                    // Vite режим
    : apiIntegration.apiBase;       // Client API режим
```

### SessionStoreCore.js

Файл: [`a2a-client/web/js/core/SessionStoreCore.js`](a2a-client/web/js/core/SessionStoreCore.js)

Хранилище состояния сессии — единый источник правды:

```javascript
class SessionStoreCore {
    _state = {
        sessionId: null,
        projectId: null,
        messages: [],        // История сообщений
        execute: null,       // Текущий execute от сервера
        context: null,       // Контекст выполнения
        status: 'idle',
        pendingForm: null,
        currentStep: 0,
        steps: []
    };
}
```

**Ключевые методы:**

- `getState()` — получить текущее состояние
- `isWaitingForInput()` — проверить, ожидается ли ввод от пользователя

### action-handler.js

Файл: [`a2a-client/web/js/action-handler.js`](a2a-client/web/js/action-handler.js)

Обрабатывает действия пользователя и отправляет их на сервер:

- `submit(sessionId, result)` — отправляет результат (message или choice) на сервер
- Автоматически создает новый шаг после отправки
- Обрабатывает polling для асинхронных запросов (promiseId)

```javascript
//流程:
// 1. submit() → POST /api/sessions/:sessionId/next
// 2. Сервер сохраняет client-result.json
// 3. Если async (есть promiseId) → начинает polling
// 4. Если sync → возвращает execute сразу
```

### task-flow.css

Файл: [`a2a-client/web/css/components/task-flow.css`](a2a-client/web/css/components/task-flow.css)

Стили для диалогового интерфейса:

- `.task-flow-message` — сообщение в чате
- `.task-flow-message-user` / `.task-flow-message-assistant` — стили по роли
- `.task-flow-form` — форма ввода
- `.task-flow-choices` — кнопки выбора
- `.task-flow-status` — индикатор статуса

---

## Структура данных

### execute (сервер → клиент)

Объект, который сервер отправляет клиенту для отображения UI:

```typescript
interface Execute {
    // Сообщение от AI (может отсутствовать в начале диалога)
    message?: {
        content: string;      // Текст сообщения
        role?: 'assistant';    // Роль отправителя
    };
    
    // Форма для ввода пользователя
    form?: {
        // Текстовое поле ввода
        input?: {
            placeholder?: string;
            required?: boolean;
        };
        
        // Кнопки выбора (вместо текстового ввода)
        choices?: Array<{
            id: string;
            label: string;
        }>;
    };
}
```

**Пример execute с формой ввода:**

```json
{
    "execute": {
        "message": {
            "content": "Привет! Чем могу помочь?",
            "role": "assistant"
        },
        "form": {
            "input": {
                "placeholder": "Введите ваш вопрос...",
                "required": true
            }
        }
    }
}
```

**Пример execute с выбором:**

```json
{
    "execute": {
        "message": {
            "content": "Выберите действие:",
            "role": "assistant"
        },
        "form": {
            "choices": [
                { "id": "analyze", "label": "Проанализировать код" },
                { "id": "refactor", "label": "Рефакторить" },
                { "id": "exit", "label": "Выйти" }
            ]
        }
    }
}
```

### result (клиент → сервер)

Объект, который клиент отправляет серверу в ответ на execute:

```typescript
interface Result {
    // Текстовое сообщение пользователя
    message?: string;
    
    // Выбор из предложенных вариантов
    choice?: string;  // ID выбранного варианта
    
    // Дополнительные данные
    metadata?: Record<string, any>;
}
```

**Пример result с сообщением:**

```json
{
    "result": {
        "message": "Помоги мне с рефакторингом функции"
    }
}
```

**Пример result с выбором:**

```json
{
    "result": {
        "choice": "analyze"
    }
}
```

### context.history

Массив истории сообщений, который накапливается на сервере:

```typescript
interface HistoryItem {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface Context {
    // ... другие поля
    history: HistoryItem[];  // История диалога
    execution: {
        action: 'dialog';
        step: string;         // Текущий шаг (например, "1", "2", "request")
    };
}
```

**Важно:** История накапливается на сервере, а не на клиенте. Клиент получает `execute` с текущим состоянием, но не хранит полную историю локально.

---

## API Endpoints

### POST /api/a2a/sessions

Создать новую сессию диалога.

**Request:**

```json
{
    "title": "Мой диалог",
    "projectId": "proj_123"
}
```

**Response:**

```json
{
    "id": "sess_1704067200000_abc123",
    "title": "Мой диалог",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "status": "created",
    "currentStep": 1,
    "messages": []
}
```

### POST /api/a2a/sessions/{id}/next

Отправить следующее сообщение в диалоге.

**Request:**

```json
{
    "task": "dialog",
    "result": {
        "message": "Привет! Помоги с кодом"
    }
}
```

**Response (sync mode):**

```json
{
    "success": true,
    "data": {
        "execute": {
            "message": {
                "content": "Привет! Рад помочь. Что именно нужно сделать?",
                "role": "assistant"
            },
            "form": {
                "input": {
                    "placeholder": "Опишите задачу..."
                }
            }
        },
        "context": {
            "history": [
                { "role": "user", "content": "Привет! Помоги с кодом", "timestamp": "..." },
                { "role": "assistant", "content": "Привет! Рад помочь. Что именно нужно сделать?", "timestamp": "..." }
            ],
            "execution": {
                "action": "dialog",
                "step": "2"
            }
        },
        "sync": true
    }
}
```

**Response (async mode):**

```json
{
    "success": true,
    "data": {
        "promiseId": "prom_1704067200000_xyz789",
        "status": "pending"
    }
}
```

### GET /api/a2a/sessions/{id}/promise/{promiseId}

Polling статуса асинхронного запроса.

**Response (в процессе):**

```json
{
    "success": true,
    "data": {
        "status": "processing",
        "submittedAt": "2024-01-01T00:00:00.000Z"
    }
}
```

**Response (завершено):**

```json
{
    "success": true,
    "data": {
        "status": "completed",
        "result": {
            "execute": { ... },
            "context": { ... }
        }
    }
}
```

---

## Серверная обработка

### dialog-request-processor.ts

Файл: [`a2a-server/src/services/core/request-processor/dialog-request-processor.ts`](a2a-server/src/services/core/request-processor/dialog-request-processor.ts)

Главный процессор диалоговых запросов:

```typescript
class DialogRequestProcessor {
    async process(request: A2ARequest): Promise<A2AResponse> {
        // 1. Определить схему (dialog/1, dialog/2, etc.)
        // 2. Применить request transforms → request.md
        // 3. Отправить в LLM (через AI Hub)
        // 4. Применить response transforms → response.md → execute
        // 5. Вернуть результат
    }
}
```

**Ключевые методы:**

- `process()` — основной метод обработки
- `processSchema()` — обработка с учетом конкретной схемы
- `recoverStuckDialog()` — восстановление застрявшего диалога

### Трансформы

Сервер использует JSON-трансформы для преобразования данных:

**dialog-request.json** (request transforms):

```json
{
    "input": {
        "task": "{{task}}",
        "context": "{{context}}",
        "result": "{{result}}"
    },
    "prompt_type": "dialog_request"
}
```

**dialog-response.json** (response transforms):

```json
{
    "output": {
        "execute": "{{execute}}",
        "message": "{{message}}"
    }
}
```

### Промпты

Файл: `prompts/transforms/dialog-request.md`

Шаблон промпта для LLM, содержит инструкции для генерации ответа:

```markdown
# Dialog Request

You are an AI assistant conducting a conversation with a user.

## Context
{{context}}

## History
{{history}}

## User Input
{{result}}

## Response Format
Вы должны ответить в формате execute + message.
```

---

## Симуляции

Эталонные данные для тестирования диалогов находятся в:

```
a2a-server/tests/simulations/dialog/
```

Структура симуляции:

```
dialog/
├── 1/                      # Шаг 1: инициация диалога
│   ├── request.json        # Запрос к серверу
│   └── response.json       # Ожидаемый ответ
├── 2/                      # Шаг 2: первый ответ пользователя
│   ├── request.json
│   └── response.json
└── ...
```

**Запуск симуляции:**

```bash
npm run sim:run dialog/1
# или
npm run sim:run dialog    # все шаги диалога
```

---

## Протокол A2A

### Sync Flow (Синхронный режим)

Используется для простых операций и тестирования:

1. Клиент отправляет запрос с `sync: true`
2. Сервер обрабатывает запрос синхронно
3. Сервер сразу возвращает `execute` с ответом
4. Клиент отображает результат

**Включение:** `DEFAULT_SYNC_MODE=1` в переменных окружения

### Async Flow (Асинхронный режим)

Используется для LLM-запросов (длительная обработка):

1. Клиент отправляет запрос (без `sync` или `sync: false`)
2. Сервер инициирует асинхронную задачу
3. Сервер возвращает `promiseId`
4. Клиент опрашивает сервер через `/promise/{promiseId}/result`
5. При завершении клиент получает `execute`

### Определение режима

| Параметр | Sync | Async |
|----------|------|-------|
| Запрос | `sync: true` | отсутствует или `sync: false` |
| Ответ | `execute` сразу в теле | `promiseId` для polling |
| Использование | Тестирование, простые формы | LLM-диалог |

---

## Non-obvious моменты

### 1. DEFAULT_SYNC_MODE влияет на поведение

По умолчанию диалог работает в асинхронном режиме. При `DEFAULT_SYNC_MODE=1`:

- Все диалоговые запросы обрабатываются синхронно
- Не требуется polling
- Удобно для разработки и тестирования

```bash
# В .env
DEFAULT_SYNC_MODE=1
```

### 2. history накапливается на сервере, не на клиенте

Клиент не хранит полную историю сообщений локально. Вместо этого:

- Клиент получает `execute` с текущим состоянием
- Контекст с историей приходит от сервера в каждом ответе
- При перезагрузке страницы клиент загружает состояние с сервера

Это архитектурное решение обеспечивает:
- Единый источник правды
- Возможность восстановления сессии
- Разделение ответственности

### 3. execute.message может отсутствовать в начале диалога

При первом запуске диалога сервер может вернуть `execute` без `message`:

```json
{
    "execute": {
        "form": {
            "input": {
                "placeholder": "Введите ваш запрос..."
            }
        }
    }
}
```

Это нормальное поведение — сервер сразу переходит к ожиданию ввода от пользователя.

### 4. promiseId vs sync response

Не путайте:

- **sync response**: сервер вернул `execute` сразу в теле ответа
- **promiseId**: сервер вернул ID для опроса статуса

При получении ответа всегда проверяйте наличие `promiseId`:

```javascript
if (response.promiseId) {
    // Начинаем polling
    pollPromise(promiseId);
} else {
    // Результат уже в response.execute
    renderExecute(response.execute);
}
```

### 5. choices vs input

В диалоговом режиме сервер может отправить либо:

- `form.input` — текстовое поле для ввода
- `form.choices` — кнопки выбора (нельзя использовать одновременно)

Клиент должен проверять наличие обоих полей и рендерить соответствующий UI.

---

## Пример полного цикла диалога

### Шаг 1: Создание сессии

```bash
curl -X POST http://localhost:5173/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{"title": "Тестовый диалог"}'
```

### Шаг 2: Первый запрос (запуск диалога)

```bash
curl -X POST http://localhost:5173/api/a2a/sessions/sess_xxx/next \
  -H "Content-Type: application/json" \
  -d '{
    "task": "dialog",
    "result": { "choice": "dialog" }
  }'
```

### Шаг 3: Ответ пользователя

```bash
curl -X POST http://localhost:5173/api/a2a/sessions/sess_xxx/next \
  -H "Content-Type: application/json" \
  -d '{
    "task": "dialog",
    "result": { "message": "Привет! Помоги с кодом" }
  }'
```

### Шаг 4: Продолжение диалога

```bash
# Ожидание ответа AI и отправка следующего сообщения
curl -X POST http://localhost:5173/api/a2a/sessions/sess_xxx/next \
  -H "Content-Type: application/json" \
  -d '{
    "task": "dialog",
    "result": { "message": "Напиши функцию сортировки" }
  }'
```

---

## Отладка

### Проверить статус сессии

```bash
curl http://localhost:5173/api/a2a/sessions/{sessionId}
```

### Проверить историю

История хранится в step-файлах:

```bash
ls -la storage/sessions/{sessionId}/
# Ищите папки вида 1/, 2/, 3/ и т.д.
cat storage/sessions/{sessionId}/{step}/messages.json
```

### Включить отладку

```bash
# В консоли браузера
localStorage.setItem('debug', 'true')

# В терминале (сервер)
DEBUG=a2a:* npm start
```

---

## Ссылки

- [A2A Protocol Overview](../architecture/adr/ADR-0001-client-architecture-overview.md)
- [Session Storage](SESSION-STORAGE.md)
- [API Reference](../api-reference/session-store.md)
