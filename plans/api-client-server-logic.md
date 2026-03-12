# API Client Server — Логика работы

> **Статус:** Утверждено  
> **Дата:** 2026-03-12

## Обзор

API Client Server (порт 3001) остаётся проксирующим слоем между Web UI (порт 5173) и A2A Server (порт 3000), но теперь активно управляет файловым хранилищем шагов, контекстом и `Promise ID`. Клиент отправляет результат пользователя → сервер сохраняет step-артефакты, вызывает `/invoke` у A2A Server, фиксирует `server-promise.json`/`server-response.json` и обновляет сессию / execute → Web UI отображает `execute` и, если нужно, ожидает следующего действия.

## Создание сессии и исходный контекст

`POST /api/sessions` принимает:

- `title` (необязательный заголовок)
- `task` (строковое задание для A2A Server)
- `context` (любые дополнительные поля, `context.execution` допустим с обязательным `action`-строкой)
- `suggestedAction` и `actionParams` (хранится в метаданных, используются UI)
- `projectId` (для project-режима)

Если в запросе есть `task`, сервер формирует `context.execution: { action: 'task', step: 'new' }`, обогащает context `session_id`, возвращает `success` + `serverResponse` (если синхронный ответ). Перед вызовом `/invoke` сохраняет `request-to-server.json` в шаге 1, потом либо `server-response.json`, либо `server-promise.json`.

`sessionService` создаёт `session.json` (метаданные/контекст/execute/messages), отслеживает `metadata.stepNum` и сохраняет `currentExecute`, `messages` (полная история), `status`.

## Структура шагов

По умолчанию шаги хранятся в `a2a-client/storage/sessions/{SESSION_ID}/{step}/`. Путь можно переопределить через `A2A_CLIENT_STORAGE_DIR`. В storage-режиме заголовок `X-Storage-Mode: storage` заставляет UI оперировать этими папками; в режиме `project` — `{projectPath}/.a2a/sessions/{sessionId}.json`.

| Файл | Папка | Назначение |
|------|-------|-----------|
| `request-to-server.json` | `{N}/` | Payload перед отправкой на A2A Server (context + result) |
| `client-result.json` | `{N}/` | Входные данные от Web клиента (message/choice) |
| `server-response.json` | `{N}/` | Ответ A2A Server (execute/context/result) |
| `server-promise.json` | `{N+1}/` | `promiseId` и статус после async-запроса |
| `messages.json` | `{N}/` | История сообщений, используемая при сборе истории |

## Поток обработки шага

```mermaid
flowchart TD
    A[Шаг N: пришёл client-result] --> B[Сохранить client-result.json]
    B --> C[Сформировать request-to-server.json (context.execution += action)]
    C --> D[Сохранить request-to-server.json и отправить POST /invoke]
    D --> E{Ответ содержит promiseId?}
    E -->|Да| F[Сохранить server-promise.json в шаге N+1, stepNum := N+1 + 1]
    E -->|Нет| G[Сохранить server-response.json в шаге N+1, stepNum := N+1]
    F --> H[Опросить GET /sessions/:id/promise/:promiseId → /requests/{promiseId}/status]
    H --> I[при completed записать server-response.json, обновить execute/context]
    G --> J[Обновить session.execute/context, вернуть execute клиенту]
```

1. Web клиент отправляет `POST /api/sessions/:id/action` (выбор) или `POST /api/sessions/:id/next` (form.input/message). Сервис сохраняет `client-result.json` и фиксирует `selectedAction`/последний `input` в metadata.
2. Формируется `request-to-server.json` для шага `N+1` с `context.execution` (action `'task'`, `'action'` или `'continue'`), `session_id`, `result` и optional `actionParams`. `validateRequestToServer` проверяет, что есть `task` либо `context`, а `context.execution.action` — строка.
3. `serverFetch` отправляет `POST /invoke` к A2A Server, затем:
   * если в ответе есть `promiseId`, создаётся `server-promise.json` в шаге `N+2`, `stepNum` обновляется на этот шаг, и фронт начинает опрос `GET /sessions/:id/promise/:promiseId`.
   * если промиса нет, сохраняется `server-response.json` в шаге `N+1`, `stepNum` увеличивается на 1.
4. В обоих случаях `sessionService.updateSessionContext`/`updateSession` сохраняют новый `context`, `currentExecute`, `messages`.

## Формирование context.execution

- **initial task:** `{ action: 'task', step: 'new' }`
- **action:** `{ action: 'action', step: <choice> }`
- **next:** `{ action: 'continue', step: 'next' }`

`result` передаётся как `{ choice, input }` или `{ message }`. `sessionService.addMessage` добавляет запись с `source: 'user-action'` или `'user-result'`, что позже читают при `GET /history`.

## Ответ A2A Server и auto-continuation

A2A Server возвращает `{ data: { execute, context, result }, promiseId?, status? }`. Response:

- `execute` содержит `form`, `message`, `wait`, `action`, `finalResult`.
- если `execute.form` не содержит `input`/`choices`, UI генерирует `autoContinue` (system-сообщение типа `auto-action`, `auto-script`, `auto-result`) и может продолжить без пользователя.
- `execute.finalResult` переводит сессию в `completed`.
- `context` сливается в `session.context`.

При sync-ответе `server-response.json` фиксируется сразу. При async-ответе `server-promise.json` сохраняет `{ promiseId, status, submittedAt }`, UI держит `promisePending`, а `GET /sessions/:id/promise/:promiseId` поллит статус (см. ниже).

## Работа с промисами и статусами

`server-promise.json` используется как точка входа для async-работы:

- поля: `promiseId`, `status` (`pending|completed|failed|cancelled`), `submittedAt`, `updatedAt`.
- когда статус `completed`, фронт находит `messages.json`/`server-response.json` через `GET /sessions/:id/step/:number/:file` или `latest`, обновляет UI и может заново вызвать `/next`.
- `GET /sessions/:id/promise/:promiseId` делает `serverFetch('GET', /requests/${promiseId}/status')` и перекидывает ответ с A2A Server, чтобы UI мог узнать `completed`/`failed`.

## REST API и файловые маршруты

### POST /api/sessions

- Создаёт `session.json` с metadata `{ title, task, stepNum: 1, context, suggestedAction, actionParams }`.
- При наличии `task` формирует `request-to-server.json` и вызывает `/invoke`.
- Ответ содержит `session`, `serverResponse` (если получен).

### POST /api/sessions/:sessionId/action

- Обязательный `choice`; `input` опционален.
- Сохраняет `client-result.json`, `selectedAction`, отправляет `request-to-server.json` → `/invoke`.
- Возвращает `execute`, `context` и, если есть, `promiseId`.

### POST /api/sessions/:sessionId/next

- `result` обязателен; как минимум `result.message` или `result.choice`.
- Аналогично action — сохраняет `client-result`, вызывает `/invoke`, возвращает execute/context/promiseId.

### POST /api/sessions/:sessionId/cancel

- Меняет `session.status` на `cancelled`, фиксирует `endTime` и добавляет системное сообщение `{ action: 'cancelled', reason: 'User requested cancellation' }`.

### GET/PUT /api/sessions/:sessionId/step/:stepNum/:file

- Позволяет инспектировать/переопределять `request-to-server.json`, `client-result.json`, `server-response.json`, `server-promise.json`, `messages.json`.

### GET /api/sessions/:sessionId/promise/:promiseId

- Проксирует `GET` к `A2A_SERVER/api/v1/requests/{promiseId}/status` и возвращает ответ для UI.

### GET /api/sessions/:sessionId/history/:fromStep

- Читает `messages.json` начиная с указанного шага и возвращает массив `{ step, content }`.

### GET /api/sessions/:sessionId/latest

- Возвращает информацию о самом верхнем шаге: `server-response`, `messages`, `execute` (если есть) и номер шага.

## Валидация

- `validateRequestToServer` требует хотя бы `task` или `context`.
- `context.execution.action`, если есть, должен быть строкой.

## Автоматические ответы (Auto Mode)

Когда `execute` не содержит `form`, UI:

1. Создаёт системное сообщение (`auto-action`, `auto-script`, `auto-result`).
2. Эмитит событие `autoContinue`.
3. Может автоматически отправить следующий `result` (если сценарий позволяет).

## Статусы

- `session.status`: `active`, `completed`, `failed`, `cancelled`.
- `server-promise.status`: `pending`, `completed`, `failed`, `cancelled`.
- `session.metadata.stepNum` указывает на номер текущего шага по файловому дереву и обновляется после каждого запроса/промиса.

## Режим хранения

- Дефолтный путь: `a2a-client/storage/sessions/{sessionId}`.
- Переназначается через `A2A_CLIENT_STORAGE_DIR`.
- Web UI переключается между `storage` и `project` режимами через `X-Storage-Mode` (`storage` по умолчанию).
