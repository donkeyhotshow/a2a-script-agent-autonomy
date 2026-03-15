# Диалоговая система на фронтенде (D2A Script Agent)

> **ВАЖНО**: Протокол A2A серьёзный — документация может быть устаревшей. Все разработки опираются на файлы симуляции протокола обмена между частями системы.

## Содержание

1. [Обзор](#обзор)
2. [Файловая структура диалога](#файловая-структура-диалога)
3. [Поток данных](#поток-данных)
4. [Ключевые компоненты](#ключевые-компоненты)
5. [Non-obvious моменты 🔴](#non-obvious-моменты-)
6. [Нарушения иерархии ⚠️](#нарушения-иерархии-)
7. [Сравнение с симуляциями](#сравнение-с-симуляциями)
8. [Рекомендации](#рекомендации)

---

## Обзор

Диалог — это основной режим взаимодействия пользователя с системой A2A. В отличие от классического execute-режима, диалоговый режим предполагает:

- **Накопление контекста** — история хранится на сервере в `context.history`
- **Интерактивность** — сервер ожидает ввод от пользователя (message или choice)
- **Два режима работы** — синхронный (sync) и асинхронный (async/promiseId)
- **Трансформы** — использует `dialog-request.json` и `dialog-response.json`

---

## Файловая структура диалога

```
a2a-client/web/js/
├── task-flow/
│   ├── api.js              ← HTTP-клиент для коммуникации с API
│   ├── core.js             ← Ядро TaskFlow, координация run/sendMessage
│   ├── index.js            ← Экспорты (sendTaskMessage)
│   └── render.js           ← Рендеринг UI: история, формы, кнопки выбора
├── core/
│   └── SessionStoreCore.js ← ES6 Module, EventEmitter, ядро управления состоянием
├── storage/
│   └── SessionStorageAPI.js
├── utils/
│   └── normalizers.js      ← Нормализация сообщений
├── action-handler.js       ← Отправка message/choice на сервер, polling promise
├── session-store-refactored.js  ← Wrapper (Composition)
├── session-store.js        ← Legacy IIFE (ДУБЛЬ!)
└── app/
    └── windows/
        ├── window-events.js   ← UI события, отправка сообщений
        └── window-state.js    ← Восстановление состояния окна
```

---

## Поток данных

### 1. Инициализация диалога

```
User clicks "+" button
        ↓
AppTask.createSession()
        ↓
SessionStore.createSession() → POST /api/a2a/sessions
        ↓
Server returns execute + context
        ↓
SessionStore.setExecute(execute)
        ↓
TaskFlow.on('execute') → Render.renderExecute()
```

### 2. Отправка сообщения пользователя

```
User types message + clicks Submit
        ↓
TaskFlow.sendMessageResult(message)
        ↓
ActionHandler.submit(sessionId, { message })
        ↓
POST /api/a2a/sessions/{id}/next
        ↓
[ASYNC] Server returns promiseId
        ↓
ActionHandler.startPromisePolling()
        ↓
[ASYNC] Poll /promise/{id} until completed
        ↓
Server returns execute + context
        ↓
SessionStore.setExecute(execute)
        ↓
Render.renderExecute()
```

### 3. Рендеринг execute (сервер → клиент)

```javascript
// Сервер отправляет объект execute:
{
    execute: {
        message: { content: "Привет!", role: "assistant" },
        form: {
            input: { placeholder: "Введите вопрос..." }
            // ИЛИ
            choices: [{ id: "analyze", label: "Проанализировать" }]
        }
    }
}
```

Рендеринг в [`render.js`](a2a-client/web/js/task-flow/render.js:123-137):

```javascript
// Маршрутизация по типу execute
if (execute.form) {
    return renderForm(...);           // Кнопки выбора или input
} else if (execute.message) {
    return renderMessage(...);        // Только сообщение
} else if (execute.script || execute['read-file']) {
    return renderClientAction(...);    // Действия на клиенте
} else if (execute.debug) {
    return renderDebug(...);          // Отладочная информация
}
```

---

## Ключевые компоненты

### task-flow/render.js

Файл: [`a2a-client/web/js/task-flow/render.js`](a2a-client/web/js/task-flow/render.js)

**Назначение:** Рендеринг UI - история сообщений, формы, кнопки выбора

**Экспорт:** `TaskFlowRender`

**Ключевые функции:**
- `renderMessageHistory(contentEl, store)` — рендерит историю сообщений
- `updateStatus(contentEl, text)` — обновляет статус выполнения
- Формирует HTML для сообщений пользователя и AI

---

### task-flow/core.js

Файл: [`a2a-client/web/js/task-flow/core.js`](a2a-client/web/js/task-flow/core.js)

**Назначение:** Основной объект `TaskFlow`, координация run/sendMessage

**Экспорт:** `TaskFlow`

**Ключевые функции:**
- `resolveStore(sessionId)` — получить хранилище для сессии
- `getProjectId()` — получить ID текущего проекта
- `sendMessageResult(messageText, contentEl)` — отправить результат

---

### task-flow/api.js

Файл: [`a2a-client/web/js/task-flow/api.js`](a2a-client/web/js/task-flow/api.js)

**Назначение:** HTTP-коммуникация с Client API

**Экспорт:** `TaskFlowAPI`

**Ключевые функции:**
- `getApiBase()` — определяет базовый URL API
- `getHeaders()` — формирует заголовки запросов
- `request(method, path, body)` — выполняет HTTP-запросы

---

### SessionStoreCore.js

Файл: [`a2a-client/web/js/core/SessionStoreCore.js`](a2a-client/web/js/core/SessionStoreCore.js)

**Назначение:** ES6 Module, ядро управления состоянием (EventEmitter)

**Состояние:**

```javascript
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
```

**Ключевые методы:**
- `getState()` — получить текущее состояние
- `isWaitingForInput()` — проверить, ожидается ли ввод от пользователя

---

### action-handler.js

Файл: [`a2a-client/web/js/action-handler.js`](a2a-client/web/js/action-handler.js)

**Назначение:** Отправка `message`/`choice` на сервер, polling promise

**Ключевые функции:**
- `submit(sessionId, result)` — отправляет результат (message или choice) на сервер
- Автоматически создает новый шаг после отправки
- Обрабатывает polling для асинхронных запросов (promiseId)

---

## Non-obvious моменты 🔴

### 1. ТРИ реализации нормализации сообщений

В проекте существует **ТРИ** реализации нормализации сообщений:

```javascript
// 1. normalizers.js (ES6 module) - РЕКОМЕНДУЕМАЯ
export function normalizeMessage(value, defaultRole) {
    return {
        id: value.id || `msg_${Date.now()}_...`,
        role: value.role || defaultRole,
        content: String(value.content || value.message || value.text),
        timestamp: value.timestamp || new Date().toISOString()
    };
}

// 2. session-store.js (inline, строки 8-19) - LEGACY
function normalizeMessage(msg, role) { /* ... */ }

// 3. SessionStoreCore.js (import из normalizers)
import { normalizeMessage } from '../utils/normalizers.js';
```

**Проблема:** Дублирование логики, несогласованность форматов.

---

### 2. Использование global.SessionStore

Несмотря на рефакторинг в ES6 модули, код активно использует глобальную переменную:

```javascript
// render.js, строка 34
store = store || global.SessionStore;

// core.js, строка 48
return global.SessionStore;
```

**Проблема:** Связь между модульной и глобальной системами затрудняет тестирование и понимание потока данных.

---

### 3. Два пути отправки сообщений

Сообщения можно отправлять через **ДВА** разных пути:

**Путь 1: ActionHandler** ([`action-handler.js:47`](a2a-client/web/js/action-handler.js:47))
```javascript
ActionHandler.submit(sessionId, { message: "text" });
```

**Путь 2: TaskFlow** ([`core.js:370`](a2a-client/web/js/task-flow/core.js:370))
```javascript
TaskFlow.sendMessageResult(messageText, contentEl);
```

**Проблема:** Оба пути используют разную логику, что приводит к несогласованности и путанице.

---

### 4. Параметр `store` в render.js поступает из ТРЁХ источников

Функция [`renderExecute`](a2a-client/web/js/task-flow/render.js:66) получает `store` из трёх источников:

```javascript
const passedStore = store || data?.store; // Явная передача
// ИЛИ
store = store || data?.store;             // Из data
// ИЛИ
store = store || global.SessionStore;     // Глобальный fallback
```

**Проблема:** Неочевидная логика разрешения зависимости.

---

### 5. Полиморфизм execute

Объект `execute` может содержать разные ключи в зависимости от типа ответа:

| Тип | Ключи |
|-----|-------|
| Диалог | `execute.message`, `execute.form` |
| Действие | `execute.script`, `execute['read-file']`, `execute['write-file']`, `execute['execute-command']` |
| Отладка | `execute.debug` |
| Результат | `execute.finalResult` |

**Проблема:** Нет явного enum или типа для различных вариантов execute.

---

### 6. Ожидание ответа сервера (wait state)

Сервер может отправить команду `wait` для блокировки ввода:

```javascript
// Из session-store.js, строка 89
if (execute && execute.wait) {
    state.status = 'processing';
    emit('wait', { message: String(execute.wait) });
}
```

**Проблема:** Состояние ожидания не обрабатывается единообразно.

---

### 7. Жестко закодированный URL ✅ ИСПРАВЛЕНО

В [`action-handler.js:36`](a2a-client/web/js/action-handler.js:36):
```javascript
if (storageMode === 'storage') {
    return window.location.origin + '/api/a2a';
}
```

**Было:** `'http://localhost:5173/api/a2a'`
**Стало:** `window.location.origin + '/api/a2a'`

---

### 8. Параметры execute.message

В документации (archive) указано:
```typescript
message?: {
    content: string;      // Текст сообщения
    role?: 'assistant';    // Роль отправителя
};
```

Но в симуляциях и реальном runtime используется:
```typescript
message?: string | {
    content: string;
    role?: 'assistant';
};
```

**Проблема:** Несоответствие типов — поле `message` может быть строкой или объектом.

---

## Нарушения иерархии ⚠️

### 1. Тройная реализация SessionStore (ОПАСНО УДАЛЯТЬ)

| Файл | Тип | Статус |
|------|-----|--------|
| `session-store.js` | Legacy IIFE | ⚠️ **НЕ УДАЛЯТЬ** - содержит методы которых нет в refactored |
| `session-store-refactored.js` | Проксирует методы | ⚠️ Не используется в index.html |
| `core/SessionStoreCore.js` | ES6 Module | ✅ Рекомендуемый (не загружается) |

**Проблема:** Legacy код содержит свою копию логики, но в index.html загружается именно он, а не refactored версия. Удаление сломает приложение.

**Решение:** Требуется полный аудит методов перед заменой.

---

### 2. Рассинхронизация между TaskFlow и ActionHandler

Оба модуля имеют методы отправки, но **не синхронизированы**:

```javascript
// task-flow/core.js:395
await handler.submit(sessionId, { message: messageText });

// action-handler.js:47
async function submit(sessionId, result) { ... }
```

**Проблема:** Нет единого интерфейса для отправки сообщений.

---

### 3. Глобальное состояние повсюду

Код активно использует глобальные переменные:

```javascript
global.SessionStore
global.TaskFlow
global.TaskFlowAPI
global.TaskFlowRender
global.ActionHandler
global.WindowRegistry
global.SessionManager
```

**Проблема:** Затрудняет тестирование, создает скрытые зависимости.

---

### 4. Отсутствие единой точки инициализации

Разные компоненты инициализируются в разных местах:

- `TaskFlow.init()` — в `app-task.js`
- `SessionStore` — создаётся при загрузке модуля
- Обработчики событий — подписываются в разных местах

**Проблема:** Нет четкого lifecycle инициализации.

---

### 5. Обработка ошибок в нескольких слоях

Ошибки обрабатываются в:
- [`error-handler.js`](a2a-client/web/js/error-handler.js) — глобальный обработчик
- `action-handler.js` — локальный try/catch
- `task-flow/core.js` — try/catch при отправке

**Проблема:** Дублирование логики обработки ошибок.

---

### 6. Потенциальные утечки памяти

Подписки на события создаются, но могут не отписываться:

```javascript
// core.js:66 — подписка без отписки
const unsubscribe = store.on('execute', (execute) => { ... });
```

**Проблема:** Утечка памяти при пересоздании компонентов.

---

## Сравнение с симуляциями

### Ожидаемый формат (из симуляций)

```json
// simulations/dialog/3/response.json (ЭТАЛОН)
{
  "context": {
    "task": "диалог",
    "execution": { "action": "dialog", "step": "request" },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  },
  "execute": {
    "message": "hello world",
    "form": { "input": [ ... ] }
  }
}
```

### Реальный ответ сервера (после исправлений)

```json
// a2a-client/storage/sessions/sess_xxx/3/server-response.json
{
  "timestamp": "...",
  "execute": {
    "message": "hello world",
    "form": { "input": [ { "name": "message", ... } ] }
  },
  "context": {
    "execution": { "action": "dialog", "step": "request" },
    "session_id": "sess_xxx",
    "task": "диалог",
    "result": { "choice": "dialog" },
    "message": "диалог",
    "version": "1.0",
    "choice_id": "dialog"
  }
}
```

### Различия

| Поле | Симуляция (эталон) | Реальность |
|------|-------------------|------------|
| `context.history` | ✅ Есть | ✅ Есть (после исправлений) |
| `execute.message` | ✅ Есть | ✅ Есть |
| `timestamp` | ❌ Нет | ✅ Лишнее |
| `session_id` | ❌ Нет | ✅ Лишнее |
| `version` | ❌ Нет | ✅ Лишнее |
| `result.choice` | ❌ Нет | ✅ Лишнее |
| `choice_id` | ❌ Нет | ✅ Лишнее |

---

## Рекомендации

### Краткосрочные (1-2 недели)

1. **Удалить legacy код**: `session-store.js` содержит дублирующую логику
2. **Вынести конфигурацию**: URL API должен быть в конфиге, не захардкожен
3. **Унифицировать отправку сообщений**: Оставить один путь (через ActionHandler)
4. **Убрать лишние поля**: timestamp, session_id, version, result, choice_id из response

### Долгосрочные (1-2 месяца)

1. **Минимизировать глобальные переменные**: Использовать DI или модули
2. **Единая точка инициализации**: Создать фабрику/бутстрапер
3. **Вынести нормализацию**: Оставить только одну реализацию в `normalizers.js`
4. **Добавить отписку от событий**: Использовать паттерн cleanup в компонентах
5. **Типизация**: Добавить TypeScript для явных контрактов
6. **统一 execute types**: Создать enum для различных типов execute

---

## Ссылки

- [Архивная документация (устаревшая)](archive/DIALOG-FRONTEND.md)
- [Симуляции dialog](a2a-server/tests/simulations/dialog/)
- [DialogRequestProcessor](a2a-server/src/services/core/request-processor/dialog-request-processor.ts)
- [Трансформы диалога](a2a-server/prompts/transforms/)
