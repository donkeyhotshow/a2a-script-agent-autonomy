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

## Реализация: session-index.json (P1)

### Дизайн решения

```json
// session-index.json (root of session folder)
{
  "sessionId": "sess_123",
  "currentStep": 5,
  "mode": "agent",  // derived from: context.execution.action || (workbench ? 'agent' : 'dialog')
  "createdAt": "2026-03-27T09:00:00Z",
  "updatedAt": "2026-03-27T09:15:00Z",
  "status": "active",  // "active" | "completed" | "corrupt"
  "promiseId": null,  // for async recovery on page refresh
  "promiseStatus": null,  // "pending" | "processing" | "completed" | "failed"
  "steps": [
    { "step": 1, "hasClientResult": false, "hasServerResponse": true },
    { "step": 2, "hasClientResult": true, "hasServerResponse": true },
    ...
  ]
}
```

### Критические требования сценариев:

#### 1. Web UI Page Refresh (восстановление состояния)
При перезагрузке страницы:
- Читается `session-index.json` → текущий step
- Читается `server-response.json` → execute, context
- Если есть `promiseId` → показывается loader + polling
- messages восстанавливаются из step/messages.json

```javascript
// loadNewSession() с восстановлением async state
const index = loadSessionIndex(cwd, sessionId);
const step = loadNewStep(cwd, sessionId, index.currentStep);

// Восстановить pending async если есть
if (index.promiseId && index.promiseStatus !== 'completed') {
  session.asyncPending = true;
  session.promiseId = index.promiseId;
  session.promiseStatus = index.promiseStatus;
}
```

#### 2. Auto Mode (Client API работает без Web UI)
Client API может работать автономно:
- `/sessions/:id/async` - опрос состояния async операций
- `/promise/:id` - polling promise результатов
- Red Room авто-ответы генерируются на сервере

```javascript
// Polling endpoint для автоматического режима
// GET /api/a2a/sessions/:id/async (web UI preferred)
// GET /api/v1/requests/:promiseId/result (server direct)

// Индекс хранит последний known state для быстрого восстановления
if (index.promiseId) {
  // Client API продолжает polling без Web UI
  return { promiseId, status: index.promiseStatus };
}
```

### Как вычисляется mode (derived, not stored):
1. **Из context.execution.action** - прямой флаг
2. **Fallback:** Если `workbench` существует в context → mode = 'agent'
3. **Default:** 'dialog'

### Как работает синхронизация:
- Индекс пишется при **каждом** вызове `saveNewStep()` 
- Это add-on операция, не заменяет существующую логику
- При загрузке: сначала читаем index → быстро находим latest step
- Fallback: если index не найден → используем существующую логику (обратная совместимость)

### Функции для работы с индексом:

```javascript
// newSessions.js additions:

// Load session index (fast path)
export function loadSessionIndex(cwd, sessionId) {
  const indexPath = path.join(getNewSessionDir(cwd, sessionId), 'session-index.json');
  if (!fs.existsSync(indexPath)) return null;
  try { return JSON.parse(fs.readFileSync(indexPath, 'utf8')); }
  catch { return null; }
}

// Save session index (called from saveNewStep)
export function saveSessionIndex(cwd, sessionId, stepData) {
  const index = loadSessionIndex(cwd, sessionId) || { sessionId, steps: [] };
  index.currentStep = stepData.step;
  index.updatedAt = new Date().toISOString();
  
  // derive mode from context
  const ctx = stepData.context || {};
  index.mode = ctx.execution?.action || (ctx.workbench ? 'agent' : 'dialog');
  
  // Восстановить async state из step-папки если есть
  const promiseData = loadServerPromise(cwd, sessionId, stepData.step);
  if (promiseData?.promiseId) {
    index.promiseId = promiseData.promiseId;
    index.promiseStatus = promiseData.status;
  } else {
    index.promiseId = null;
    index.promiseStatus = null;
  }
  
  // update step metadata
  const stepMeta = index.steps.find(s => s.step === stepData.step) || { step: stepData.step };
  stepMeta.hasServerResponse = true;
  if (!index.steps.find(s => s.step === stepData.step)) index.steps.push(stepMeta);
  
  fs.writeFileSync(path.join(getNewSessionDir(cwd, sessionId), 'session-index.json'), JSON.stringify(index, null, 2));
}

// Optimize loadNewSession with index:
export function loadNewSession(cwd, sessionId) {
  const index = loadSessionIndex(cwd, sessionId);
  if (index?.currentStep) {
    // Fast path: use index
    const step = loadNewStep(cwd, sessionId, index.currentStep);
    if (step) {
      const session = reconstructFromStep(step, index);
      // Восстановить async state для page refresh
      if (index.promiseId) {
        session.promiseId = index.promiseId;
        session.promiseStatus = index.promiseStatus;
        session.asyncPending = index.promiseStatus !== 'completed';
      }
      return session;
    }
  }
  // Fallback: existing logic
  ...
}
```

---

## Реализация: mode flag (P2)

### Решение: mode вычисляется, не хранится

```javascript
// derive mode from session data
export function deriveSessionMode(session) {
  const ctx = session.context || {};
  
  // 1. Explicit action flag
  if (ctx.execution?.action === 'agent') return 'agent';
  if (ctx.execution?.action === 'task-decomposition') return 'task-decomposition';
  if (ctx.execution?.action === 'dialog') return 'dialog';
  
  // 2. Workbench presence (agent mode only)
  if (ctx.workbench && Object.keys(ctx.workbench).length > 0) return 'agent';
  
  // 3. Default: dialog
  return 'dialog';
}
```

### Использование:
- UI использует `deriveSessionMode(session)` для отображения
- Context сохраняется как есть (workbench optional)
- Обратная совместимость: старые сессии без workbench → dialog mode

---

## Важные сценарии (добавлены в план)

### Сценарий 1: Web UI Page Refresh
- **Требование:** При перезагрузке страницы всё должно восстановиться
- **Решение:** 
  - session-index.json хранит promiseId + promiseStatus
  - loadNewSession() восстанавливает asyncPending flag
  - UI показывает loader пока promise не завершён

### Сценарий 2: Auto Mode (Client API без Web UI)
- **Требование:** Client API работает автоматикой, веб только опрашивает
- **Решение:**
  - `/api/a2a/sessions/:id/async` - основной polling endpoint
  - `/api/v1/requests/:promiseId/result` - серверный polling
  - session-index.json позволяет быстро узнать статус без чтения всех шагов
  - Red Room (auto-ответы) работает на сервере, клиент только опрашивает

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