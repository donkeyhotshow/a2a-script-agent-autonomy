# S20: projectId и sessionId не отправляются с сервера на клиента

## Problem

Пользователь сообщает, что `projectId` и `sessionId` не передаются с сервера на клиента, и также не приходят с сервера. Это может указывать на проблему с передачей идентификаторов сессий и проектов между клиентом и сервером, что потенциально нарушает функциональность многошаговых действий или управления сессиями.

## Current Design

Согласно разделу "Invoke payload privacy" в AGENTS.md:

- Client API сохраняет human-facing `sessionId` и `projectId` в `a2a-client/storage/…` и удаляет их перед проксированием к `/api/v1/invoke`. Метаданные проекта (`projectId`/`projectRoot`) и любой camelCase `sessionId` удаляются до того, как сервер их увидит.

- Stateless A2A Server всегда присваивает свой собственный `context.session_id` (в настоящее время `srv_sess_<uuid>`), возвращает его внутри контекста ответа, и Client API повторно использует этот токен, выданный сервером, для последующих invokes. Это позволяет многошаговым действиям оставаться привязанными к серверной сессии без утечки идентификаторов проекта или хранилища.

Таким образом, по дизайну `projectId` не отправляется на сервер, а клиентский `sessionId` также не отправляется. Вместо этого сервер возвращает свой собственный `session_id` в контексте.

## Investigation Required

- Проверить, действительно ли это поведение по дизайну или есть баг, при котором `session_id` не возвращается корректно.
- Изучить логи сессий и API вызовов для подтверждения, что серверные `session_id` генерируются и возвращаются.
- Убедиться, что Client API правильно использует возвращенный `session_id` для follow-up invokes.
- Если пользователь сообщает это как проблему, определить, ожидают ли они передачи оригинальных `projectId` и `sessionId` от сервера.

## Verification Steps

1. Создать новую сессию через Client API (`POST /api/a2a/sessions`) с `projectId` и наблюдать логи/ответы.
2. Проверить, что в payload к `/api/v1/invoke` нет `projectId` или клиентского `sessionId`.
3. В ответе сервера найти `context.session_id` (например, `srv_sess_...`).
4. Выполнить follow-up `POST /api/a2a/sessions/{id}/next` и убедиться, что используется серверный `session_id`.
5. Проверить хранилище сессий в `a2a-client/storage/sessions/` на наличие оригинальных идентификаторов.
6. Если проблема подтверждается, проверить ADR-0028 и связанные документы по Client API deployment modes.

## Места для изменения кода

### 1. a2a-client/shared/a2a-invoke-builders.mjs - sanitizeContextForServer функция
**Изменение:** Удалить строки, удаляющие `projectId` и `projectRoot` из контекста перед отправкой на сервер.

**Текущий код (строки 45-46):**
```javascript
delete safe.projectId;
delete safe.projectRoot;
```

**Измененный код:**
Удалить эти строки.

**Что делает изменение:** Позволяет серверу получать `projectId` в контексте запроса, чтобы он мог включить его в ответ.

### 2. a2a-server/src/services/core/request-processor/action-request-processor.ts - возвраты результатов
**Изменение:** В методах `handleTaskRequest`, `handleStepResult` и `handleRouterChoice` добавить `projectId` в возвращаемый `context`, если он присутствует во входном контексте.

**Пример изменения (в handleTaskRequest, около строк 188-192):**
```typescript
return {
    outcome: 'completed',
    context: {
        ...result.message.context,
        ...(ctx.projectId ? { projectId: ctx.projectId } : {}),
    },
    activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
    execute: fromMessage,
};
```

**Аналогичные изменения в других return statements.**

**Что делает изменение:** Обеспечивает, что `projectId` из входного контекста включается в ответ сервера.

### 3. Другие процессоры запросов
**Изменение:** Убедиться, что `projectId` включается в `context` ответов в `dialog-request-processor.ts`, `simulation-request-processor.ts` и `form-request-processor.ts`.

В `dialog-request-processor.ts` контекст уже включает входной `ctx`, поэтому `projectId` будет автоматически включен после изменения 1.

Для других процессоров проверить и добавить аналогично action-request-processor.

**Что делает изменение:** Гарантирует, что все процессоры возвращают `projectId` в ответах, если он был предоставлен.

### 4. a2a-client/packages/vite-plugin/routes/step-routes-dialog-flow.js - добавление client sessionId в mergedContext
**Изменение:** Перед вызовом `sanitizeContextForServer`, добавить клиентский `sessionId` в `mergedContext`.

**Пример изменения (около строки 199):**
```javascript
mergedContext.sessionId = sessionId;
const contextForServer = sanitizeContextForServer(mergedContext);
```

**Что делает изменение:** Добавляет клиентский `sessionId` в контекст, отправляемый на сервер, чтобы сервер мог его получить и потенциально включить в ответ.

### 5. a2a-client/shared/a2a-invoke-builders.mjs - не удалять sessionId в sanitizeContextForServer
**Изменение:** Удалить строку `delete safe.sessionId;` из функции `sanitizeContextForServer`.

**Текущий код (строка 48):**
```javascript
delete safe.sessionId;
```

**Измененный код:** Удалить эту строку.

**Что делает изменение:** Позволяет `sessionId` из контекста клиента быть переданным на сервер вместо его удаления.

### 6. Серверные процессоры для включения client sessionId в response context
**Изменение:** В процессорах запросов сервера (`action-request-processor.ts`, `dialog-request-processor.ts` и т.д.) добавить `sessionId` в возвращаемый `context`, если он присутствует во входном контексте.

**Пример изменения (аналогично projectId в action-request-processor около строк 188-192):**
```typescript
return {
    outcome: 'completed',
    context: {
        ...result.message.context,
        ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
    },
    activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
    execute: fromMessage,
};
```

**Аналогичные изменения в других return statements и процессорах.**

**Что делает изменение:** Обеспечивает, что клиентский `sessionId` из входного контекста включается в ответ сервера, позволяя клиенту получить его обратно.

## Обновление симуляций

### Изменения в response.json
В файлах `simulations/**/response.json` добавить `projectId` и `clientSessionId` в `context`, если они присутствуют в соответствующих `received.json`.

Пример для `simulations/gray-room/step-complete-advance/response.json`:
Добавить в `context`:
```json
"projectId": "default",
"clientSessionId": "sess_gray_room_step_complete_advance"
```

### Проверка sim-validate
Убедиться, что `npm run sim:validate` проходит после изменений. Возможно, потребуется обновить валидаторы, если они ожидают отсутствие этих полей.

### Что делает изменение
Симуляции должны отражать новое поведение, где сервер включает projectId и clientSessionId в ответы.