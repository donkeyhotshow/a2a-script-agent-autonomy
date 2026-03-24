# Система агента на фронтенде (A2A Script Agent)

> **Дата обновления**: 2026-03-14
> **Статус**: Актуальная документация

## Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Файловая структура](#файловая-структура)
4. [Загрузка модулей](#загрузка-модулей)
5. [Поток данных](#поток-данных)
6. [Исправленные проблемы](#исправленные-проблемы)
7. [Известные проблемы](#известные-проблемы)

---

## Обзор

Агентский режим — основной режим взаимодействия пользователя с системой A2A:

- **Накопление контекста** — история в `context.history` и структурированное рабочее состояние в `context.workbench.sections`
- **Интерактивность** — сервер ожидает ввод (message или choice) с обязательным **action-key shape** для результатов
- **Два режима** — синхронный (sync) и асинхронный (promiseId)
- **Трансформы** — для шагов без LLM: `agent-request.json` / `agent-response.json`. Для LLM-режима на сервере: `server-transforms-request.json` → `agent-request.md`, ответ → **`agent-llm-response.json`** (парсинг JSON, `execute`, опционально `workbench`), см. [`AGENTS.md`](../../AGENTS.md) § Agent mode.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                      index.html (Vite Dev Server)                │
├─────────────────────────────────────────────────────────────────┤
│  order  │  file                              │  type            │
├─────────┼────────────────────────────────────┼──────────────────┤
│    1    │  js/storage.js                     │  Legacy IIFE     │
│    2    │  js/session-store-refactored.js    │  ES6 Module ✅   │
│    3    │  js/session-store-adapters.js      │  ES6 Module     │
│    4    │  js/template-loader.js             │  Legacy IIFE     │
│    5    │  js/api-integration.js            │  Legacy IIFE     │
│    6    │  js/action-handler.js             │  Legacy IIFE     │
│    7    │  js/error-handler.js              │  Legacy IIFE     │
│    8    │  js/task-flow/*                   │  Legacy IIFE     │
│    9    │  js/app-task.js (dynamic load)    │  Dynamic         │
└─────────────────────────────────────────────────────────────────┘
```

### Слои системы:

1. **Storage Layer** — `storage.js`, `SessionStorageAPI.js`
2. **State Layer** — `SessionStoreCore.js`, `session-store-refactored.js`
3. **API Layer** — `action-handler.js`, `api-integration.js`
4. **UI Layer** — `task-flow/*`, `app/*`
5. **Error Layer** — `error-handler.js`

---

## Файловая структура

```
a2a-client/web/js/
├── task-flow/
│   ├── api.js              ← HTTP-клиент
│   ├── core.js             ← Координация run/sendMessage
│   ├── index.js            ← Экспорты
│   └── render.js           ← Рендеринг UI
├── core/
│   └── SessionStoreCore.js ← ES6 Module, EventEmitter ✅
├── storage/
│   └── SessionStorageAPI.js
├── utils/
│   └── normalizers.js      ← canonical normalizeMessage; install-normalizers.mjs → window.Normalizers
├── action-handler.js       ← Отправка message/choice
├── session-store-refactored.js  ← Wrapper (Composition) ✅
├── session-store.js        ← Legacy IIFE (fallback)
├── session-store-adapters.js ← Backward Compatibility
└── app/
    ├── app-task.js         ← Dynamic loader
    ├── project-manager.js
    ├── session-manager.js
    ├── taskbar-manager.js
    └── windows/
        ├── window-events.js
        ├── window-state.js
        └── window-manager.js
```

---

## Загрузка модулей

### index.html (строки 88-116):

```html
<!-- 0. Storage API -->
<script src="js/storage.js"></script>

<!-- 1. Core State (Refactored - ES6 Modules) -->
<script type="module" src="js/session-store-refactored.js"></script>

<!-- 1b. Legacy (deprecated - for fallback only) -->
<!-- <script type="module" src="js/session-store.js"></script> -->

<!-- 2. Adapters (Backward Compatibility Layer) -->
<script type="module" src="js/session-store-adapters.js"></script>

<!-- 3. UI Modules -->
<script src="js/template-loader.js"></script>
<script src="js/api-integration.js"></script>
<script src="js/action-handler.js"></script>
<script src="js/error-handler.js"></script>

<!-- 4. TaskFlow -->
<script src="js/task-flow/api.js"></script>
<script src="js/task-flow/render.js"></script>
<script src="js/task-flow/core.js"></script>
<script src="js/task-flow/index.js"></script>
<script src="js/app-task.js"></script>
```

### Динамическая загрузка app/*:

```javascript
// app-task.js
const modules = [
    '/js/app/project-manager.js',
    '/js/app/session-manager.js',
    '/js/app/windows/window-registry.js',
    // ...
];
```

---

## Поток данных

### 1. Инициализация сеанса

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

### 2. Отправка сообщения

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
---

## Визуализация процесса (Process Visualization)

Чтобы пользователь понимал, что делает агент в асинхронном режиме, фронтенд использует данные из `context.execution` и `execute.attachments`.

### 1. Индикаторы состояния (Status Mapping)

| Поле | Значение (Пример) | Элемент UI | Описание |
|------|-------------------|------------|----------|
| `execution.step` | `plan`, `execute` | **Заголовок шага** | Верхняя часть панели (например, "Этап: Выполнение") |
| `execution.progress` | `45` | **Progress Bar** | Процент завершения текущей задачи |
| `execution.action` | `reading files` | **Status Text** | Короткое пояснение под спиннером |

### 2. Рендеринг активности (Activity Feedback)

Поскольку веб-клиент не получает сырые данные протокола (`read-file`, `rag-search` и т.д.), он использует объект `attachments` для визуализации активности:

1. **RAG Search**: Если есть `attachments.ragQuery`, UI показывает индикатор "Поиск в кодовой базе: [query]".
2. **Файлы**:
   - `readFiles`: Список прочитанных файлов (имена/пути).
   - `writtenFiles`: Список измененных или созданных файлов.
3. **Команды**: `shellCommand` отображает выполняемую в данный момент терминальную команду (например, `npm install`).
4. **Динамический статус**: Если `message` от сервера отсутствует (в промежуточных шагах), UI генерирует статус на основе `pendingClientAction` (например, "Идет выполнение скрипта…").

> [!TIP]
> Вложения (`attachments`) позволяют пользователю видеть "мыслительный" и "операционный" процесс агента в реальном времени, даже если итоговый ответ еще не готов. Данные для визуализации очищаются на уровне Client API функцией `buildWebExecute`.

---

## Исправленные проблемы

| # | Проблема | Дата | Файл |
|---|----------|------|------|
| 1 | Хардкод URL `localhost:5173` | 2026-03 | action-handler.js |
| 2 | Лишние поля в ответе сервера | 2026-03 | requests.routes.ts |
| 3 | Дубликат normalizeMessage | 2026-03 | session-store.js |
| 4 | Отладочные console.log | 2026-03 | multiple files |
| 5 | Миграция на refactored session-store | 2026-03 | index.html |

### Детали исправлений:

**1. URL в action-handler.js:36**
```javascript
// Было:
return 'http://localhost:5173/api/a2a';

// Стало:
return window.location.origin + '/api/a2a';
```

**2. Фильтрация полей в requests.routes.ts**
```javascript
// Удалены из response: timestamp, session_id, version, result, choice_id
```

**3. normalizeMessage** — single implementation in `utils/normalizers.js`; legacy globals via `install-normalizers.mjs`.

---

## Известные проблемы

### Требуют внимания:

1. **Смешанные парадигмы** — ES6 Modules + Legacy IIFE
2. **Глобальные переменные** — window.SessionStore, window.TaskFlow и т.д.
3. **Динамическая загрузка** — нет статического анализа зависимостей
4. **Legacy IIFE файлы** — требуют миграции на ES6:
   - action-handler.js
   - api-integration.js
   - error-handler.js
   - task-flow/*

### Не влияют на работу:

- Дубликат normalizeMessage (добавлена документация)
- session-store.js оставлен как fallback

---

## Рекомендации

1. **Краткосрочные**: 
   - Удалить неиспользуемые legacy файлы после миграции

2. **Среднесрочные**:
   - Миграция action-handler.js → ES6 Module
   - Заменить динамическую загрузку на статические import

3. **Долгосрочные**:
   - Полный рефакторинг в единую модульную систему
   - Удаление глобальных переменных

---

## Ссылки

- [Симуляции протокола](../../simulations/agent/) (роутер, шаг 1); полные цепочки — [`agent-coder`](../../simulations/agent-coder/), [`agent-auto-ai`](../../simulations/agent-auto-ai/)
- [API Reference](./api-reference/)
- [Workflows](./workflows/)
