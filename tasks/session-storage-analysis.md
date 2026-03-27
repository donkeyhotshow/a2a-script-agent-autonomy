# Анализ системы хранения сессий

> Глубокий анализ текущей системы сохранения сессий для агентского диалога.

## Текущая архитектура

### Файловая структура (step-by-step)

```
storage/sessions/{sessionId}/
├── 1/
│   ├── server-response.json    # execute + context (без messages)
│   ├── messages.json           # messages slice for step 1
│   ├── client-result.json      # (optional) user/tool result
│   ├── request-to-server.json  # (optional) request sent
│   └── server-promise.json     # (optional) async state
├── 2/
│   └── ...
└── N/
    └── ...
```

### Источники данных

| Файл | Источник | Назначение |
|------|----------|------------|
| `server-response.json` | A2A Server response | execute, context, result |
| `messages.json` | Step message slice | UI history |
| `client-result.json` | Client tool output | Red Room results |
| `request-to-server.json` | Client API request | Debug/audit |
| `server-promise.json` | Promise state | Async tracking |

---

## Как данные используются для Web UI

### 1. Восстановление сессии (loadNewSession)

```javascript
// newSessions.js: loadNewSession()
1. Найти highest step с server-response.json
2. Из него взять: execute, context, title
3. Дополнительно: messages.json для истории
```

### 2. Построение timeline (collectCanonicalTimeline)

```javascript
// message-timeline.js: collectCanonicalTimeline()
Для каждого step:
  1. context.history → role + content
  2. execute.message → assistant message
  3. messages.json → role + content
  4. client-result → user message

Приоритет: history → execute → step-messages → client-result
```

### 3. Проекция для UI (session-projection-dto.js)

```javascript
// toPublicSession()
- Удалить context (по умолчанию)
- Построить execute projection (message/form/attachments)
- Сохранить messages
```

---

## Выявленные проблемы

### Проблема 1: Слишком много файлов для простой задачи

**Текущее:**
- Для простого сообщения нужно 2+ файла (response + messages)
- Для red room - 3 файла (response + client-result + request)
- Найти "текущее состояние" - нужно искать highest step

**Проблема:**
- Сложно понять "где я сейчас"
- Нужен универсальный алгоритм восстановления
- Легко сделать ошибку при ручной проверке

### Проблема 2: Дублирование данных

**Пример:**
```
step/1/messages.json имеет те же сообщения что и
step/2/context.history (частично)
step/2/messages.json
```

**Проблема:**
- sourcePriority нужен чтобы dedupe
- Неочевидно что откуда брать
- Конфликты при partial updates

### Проблема 3: context - "black box"

**Текущее:**
- `context` содержит: history, execution, workbench, files
- Все это в одном JSON
- Нужен `includeContext=1` чтобы увидеть

**Проблема:**
- Нельзя просто посмотреть "что сделал агент"
- workbench.sections - важные данные, но глубоко в context
- Нужно парсить весь context для простых вещей

### Проблема 4: Нет единого "состояния"

**Текущее:**
- Состояние распределено: execute (текущее действие), messages (история), context (все остальное)
- Нет "простого" способа ответить на "в каком состоянии агент?"

**Проблема:**
- UI должен знать про все три составляющие
- Сложно написать "где мы" для debugging

### Проблема 5: Agent mode vs Dialog

**Текущее:**
- Dialog: simple messages
- Agent: workbench, sections, slots, interruptTrace

**Проблема:**
- Нет явного флага "это агентская сессия"
- workbench опционален - непонятно когда есть а когда нет

---

## Предложения по упрощению

### Вариант А: Состояние в одном файле

```json
// session-state.json
{
  "sessionId": "...",
  "mode": "agent",  // "dialog" | "agent"
  "currentStep": 3,
  "status": "active",
  "execute": { ... },
  "messages": [ ... ],
  "workbench": { ... },  // only for agent mode
  "lastUpdate": "2026-03-27T09:00:00Z"
}
```

**Плюсы:** Один файл, всё в одном месте
**Минусы:** Нужно переписать storage layer полностью

### Вариант Б: Улучшенные метаданные

```json
// 3/server-state.json (улучшенный server-response.json)
{
  "step": 3,
  "mode": "agent",
  "timestamp": "...",
  "execute": { ... },
  "context": { ... },  // only if needed
  "messages": [ ... ],
  "metadata": {
    "hasWorkbench": true,
    "hasPendingAsync": false,
    "hasClientResult": false
  }
}
```

**Плюсы:** Минимальные изменения, добавляем метаданные
**Минусы:** всё ещё step-based

### Вариант В: Индексный файл

```json
// session-index.json
{
  "sessionId": "sess_123",
  "mode": "agent",
  "currentStep": 5,
  "steps": [
    { "step": 1, "type": "form", "title": "Выбор режима" },
    { "step": 2, "type": "message", "user": "Привет" },
    { "step": 3, "type": "agent", "hasWorkbench": true },
    ...
  ],
  "summary": {
    "lastMessage": "Агент анализирует код",
    "workbenchSections": ["analysis", "code"],
    "pendingAsync": false
  }
}
```

**Плюсы:** Единая точка входа, понятно "где мы"
**Минусы:** Нужно синхронизировать при обновлениях

---

## Что нужно сделать

1. **Определить минимальный API для состояния** - что нужно для UI?
2. **Выбрать вариант (А/Б/В)** - **ПРИНЯТО: step-based (Вариант Б - улучшенные метаданные)**
3. **Написать план миграции** - как перейти без слома?
4. **Обновить документацию** - объяснить новую структуру

---

## Вопросы для уточнения

1. ~~Какой формат предпочтительнее - один файл илиstep-based с индексом?~~ - **ПРИНЯТО: step-based**
2. Нужно ли хранить полную историю в одном месте или только текущее состояние?
3. Как часто нужно "историю" vs "текущее состояние"?
4. Agent mode really needed in every session or only when explicitly started?

---

## Связанные файлы

- `a2a-client/vite-plugin-a2a/storage/newSessions.js` - текущая логика
- `a2a-client/vite-plugin-a2a/routes/utils/message-timeline.js` - timeline builder
- `a2a-client/vite-plugin-a2a/routes/utils/session-projection-dto.js` - projection
- `a2a-client/docs/SESSION-STORAGE.md` - документация