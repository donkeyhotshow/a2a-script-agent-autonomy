# a2a-client/web DEV_STATE

> Web component documentation (Порт 5173)
> Последнее обновление: 2026-03-06

## Статус

- **Статус**: В разработке
- **Фокус**: Отладка диалога, SSE интеграция, оптимизация загрузки

---

## Архитектура механизма диалога

Система диалога состоит из 6 ключевых компонентов, работающих together:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEB UI (порт 5173)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌─────────────────────┐    ┌───────────────────┐  │
│  │ SessionManager   │    │ SessionPanelManager│    │ SessionViewModel  │  │
│  │                  │    │                    │    │                   │  │
│  │ - loadSessions() │    │ - addPanel()       │    │ - messages[]      │  │
│  │ - createSession()│    │ - removePanel()    │    │ - execute         │  │
│  │ - deleteSession()│    │ - saveLayout()     │    │ - on/off/emit     │  │
│  │ - getConversation│    │ - _applyLayout()   │    │                   │  │
│  └────────┬─────────┘    └──────────┬──────────┘    └─────────┬─────────┘  │
│           │                         │                       │             │
│           └─────────────────────────┼───────────────────────┘             │
│                                     │                                         │
│                                     ▼                                         │
│  ┌──────────────────┐    ┌─────────────────────┐    ┌───────────────────┐  │
│  │ SSEClient        │◄──►│ SessionSync         │◄──►│ WebSocketClient   │  │
│  │                  │    │                     │    │                   │  │
│  │ - connect()      │    │ - applyContext()    │    │ - connect()       │  │
│  │ - disconnect()   │    │ - applyExecute()    │    │ - send()          │  │
│  │ - on/off/emit    │    │ - pushMessage()     │    │ - heartbeat       │  │
│  │ - reconnect      │    │                     │    │ - reconnect       │  │
│  └────────┬─────────┘    └──────────┬──────────┘    └─────────┬─────────┘  │
│           │                          │                         │             │
└───────────┼──────────────────────────┼─────────────────────────┼─────────────┘
            │                          │                         │
            ▼                          ▼                         ▼
      Server-Sent Events         HTTP API              WebSocket (альтернатива)
            │                                                 
            ▼                                                 
     /api/sse/:sessionId                              
```

---

## Компоненты механизма диалога

### 1. SessionManager ([`session-manager.js`](js/session-manager.js))

**Назначение**: Управление сессиями - создание, загрузка, удаление, переключение.

**Ключевые методы**:

| Метод | Описание |
|-------|----------|
| [`init(options)`](js/session-manager.js:32) | Инициализация менеджера |
| [`loadSessions(projectId)`](js/session-manager.js:94) | Загрузка списка сессий проекта |
| [`createSession(options)`](js/session-manager.js:115) | Создание новой сессии |
| [`getSession(sessionId)`](js/session-manager.js:141) | Получение сессии по ID |
| [`deleteSession(sessionId)`](js/session-manager.js:160) | Удаление сессии |
| [`setActiveSession(sessionId)`](js/session-manager.js:180) | Установка активной сессии + подключение SSE |
| [`getConversation(sessionId)`](js/session-manager.js:214) | Получение истории сообщений |
| [`processExecute(execute, context)`](js/session-manager.js:413) | Обработка execute из протокола v2.0 |

**События** (Event-driven):

```javascript
SessionManager.on('sessionsLoaded', (sessions) => {...});
SessionManager.on('sessionCreated', (session) => {...});
SessionManager.on('sessionDeleted', (sessionId) => {...});
SessionManager.on('sessionChanged', (sessionId) => {...});
SessionManager.on('conversationLoaded', ({sessionId, messages}) => {...});
SessionManager.on('formReceived', (form) => {...});        // execute.form.choices
SessionManager.on('messageReceived', (message) => {...}); // execute.message
SessionManager.on('executionStep', (data) => {...});        // context.execution.step
SessionManager.on('executionProgress', (data) => {...});   // context.execution.progress
```

**Протокол v2.0** - Поддерживаемые execute типы:

| Тип | Обработчик | Описание |
|-----|------------|----------|
| `execute.form` | [`formReceived`](js/session-manager.js:451) | Выбор из вариантов (choices) |
| `execute.message` | [`messageReceived`](js/session-manager.js:458) | UI-only сообщение |
| `execute.script` | [`scriptReceived`](js/session-manager.js:467) | Выполнение JS |
| `execute['rag-search']` | [`ragSearchReceived`](js/session-manager.js:473) | RAG поиск |
| `execute['read-file']` | [`readFileReceived`](js/session-manager.js:479) | Чтение файла |
| `execute['write-file']` | [`writeFileReceived`](js/session-manager.js:485) | Запись файла |
| `execute['execute-command']` | [`executeCommandReceived`](js/session-manager.js:491) | Выполнение команды |
| `execute.finalResult` | [`finalResultReceived`](js/session-manager.js:444) | Финальный результат |

---

### 2. SessionPanelManager ([`session-panel-manager.js`](js/session-panel-manager.js))

**Назначение**: Управление floating panels для каждой сессии в UI.

**Ключевые методы**:

| Метод | Описание |
|-------|----------|
| [`setProject(projectId)`](js/session-panel-manager.js:53) | Установка проекта, загрузка сессий |
| [`_addOrUpdatePanel(session)`](js/session-panel-manager.js:71) | Добавление/обновление панели |
| [`_renderPanel(panel, session)`](js/session-panel-manager.js:139) | Рендер контента панели |
| [`_savePanelLayout(sessionId, panel, state)`](js/session-panel-manager.js:244) | Сохранение layout на сервер |
| [`_applyLayout(panel, layout)`](js/session-panel-manager.js:190) | Применение сохранённого layout |
| [`_focusPanel(sessionId)`](js/session-panel-manager.js:220) | Активация панели (bring to front) |
| [`_removePanel(sessionId)`](js/session-panel-manager.js:229) | Удаление панели |

**Panel Layout структура** (сохраняется в `session.context.panelLayout`):

```javascript
{
    id: "session-panel-xxx",      // ID панели
    type: "session",               // Тип панели
    state: "expanded" | "collapsed", // Состояние
    slot: "floating" | "left" | "right" | "bottom", // Слот позиционирования
    title: "Session Title",        // Заголовок
    left: "100px",                 // Координаты
    top: "200px",
    width: "400px",
    height: "300px"
}
```

**Интеграция с PlasticineUI**:

- [`_ensurePui()`](js/session-panel-manager.js:291) - инициализация PlasticineUI
- [`pui.addPanel(options)`](js/session-panel-manager.js:86) - создание панели
- [`pui.removePanel(panelId)`](js/session-panel-manager.js:233) - удаление панели
- [`pui.bringToFront(panelId)`](js/session-panel-manager.js:223) - перенос на передний план

---

### 3. SessionViewModel ([`session-view-model.js`](js/session-view-model.js))

**Назначение**: Простое реактивное хранилище состояния сессии.

**Состояние**:

```javascript
{
    sessionId: "sess_xxx",      // ID текущей сессии
    projectId: "p_xxx",         // ID проекта
    messages: [...],            // Массив сообщений (max 200)
    execute: {...}              // Текущий execute объект
}
```

**Ключевые методы**:

| Метод | Описание |
|-------|----------|
| [`reset(sessionId, projectId)`](js/session-view-model.js:29) | Сброс состояния |
| [`setSession(sessionId)`](js/session-view-model.js:40) | Установка sessionId |
| [`setProject(projectId)`](js/session-view-model.js:47) | Установка projectId |
| [`setMessages(messages)`](js/session-view-model.js:54) | Установка массива сообщений |
| [`pushMessage(message, role)`](js/session-view-model.js:64) | Добавление сообщения |
| [`setExecute(execute)`](js/session-view-model.js:74) | Установка execute |
| [`getState()`](js/session-view-model.js:80) | Получение полного состояния |

**События**:

```javascript
SessionViewModel.on('reset', ({sessionId, projectId}) => {...});
SessionViewModel.on('session', (sessionId) => {...});
SessionViewModel.on('project', (projectId) => {...});
SessionViewModel.on('messages', (messages) => {...});     // весь массив
SessionViewModel.on('message', (message) => {...});       // одно сообщение
SessionViewModel.on('execute', (execute) => {...});
```

**Нормализация сообщений** - [`normalizeMessage(value, role)`](js/session-view-model.js:6):

```javascript
{
    id: "msg_xxx",              // Уникальный ID
    role: "user|assistant|system",
    content: "Текст сообщения",
    timestamp: "ISO8601",
    metadata: {...}
}
```

---

### 4. SSEClient ([`sse-client.js`](js/sse-client.js))

**Назначение**: Server-Sent Events для real-time обновлений от сервера.

**Подключение**:

```javascript
// URL формат: /api/sse/:sessionId?token=xxx
SSEClient.connect(sessionId, '/api');
```

**Конфигурация**:

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `maxReconnectAttempts` | 5 | Максимум попыток переподключения |
| `reconnectDelay` | 3000ms | Задержка между попытками |
| `apiBase` | `/api` | Базовый API URL |

**Поддерживаемые события** (Server-Sent Events):

| Событие | Обработчик | Описание |
|---------|------------|----------|
| `connected` | [`on('connected')`](js/sse-client.js:173) | Установлено соединение |
| `log` | [`on('log')`](js/sse-client.js:185) | Лог сообщение |
| `progress` | [`on('progress')`](js/sse-client.js:195) | Прогресс выполнения |
| `status` | [`on('status')`](js/sse-client.js:205) | Изменение статуса |
| `task_response` | [`on('task_response')`](js/sse-client.js:216) | Ответ на задачу |
| `action_proposal` | [`on('action_proposal')`](js/sse-client.js:226) | Предложение действия |
| `action_executing` | [`on('action_executing')`](js/sse-client.js:236) | Выполнение действия |
| `step_result` | [`on('step_result')`](js/sse-client.js:246) | Результат шага |
| `complete` | [`on('complete')`](js/sse-client.js:256) | Задача завершена |
| `error` | [`on('error')`](js/sse-client.js:266) | Ошибка |
| `session_update` | [`on('session_update')`](js/sse-client.js:281) | Обновление сессии |
| `node_added` | [`on('node_added')`](js/sse-client.js:291) | Добавлен нод |
| `node_updated` | [`on('node_updated')`](js/sse-client.js:301) | Обновлён нод |
| `edge_added` | [`on('edge_added')`](js/sse-client.js:311) | Добавлено ребро |

**Методы**:

| Метод | Описание |
|-------|----------|
| [`connect(sessionId, apiBase)`](js/sse-client.js:102) | Подключение к SSE |
| [`disconnect()`](js/sse-client.js:348) | Отключение |
| [`isConnected()`](js/sse-client.js:358) | Проверка статуса |
| [`on(event, handler)`](js/sse-client.js:322) | Подписка на событие |
| [`off(event, handler)`](js/sse-client.js:329) | Отписка от события |
| [`emit(event, data)`](js/sse-client.js:337) | Emit (внутренний) |

**API Client** (встроенный):

```javascript
SSEClient.apiClient.createSession(projectId, title);
SSEClient.apiClient.getSession(sessionId);
SSEClient.apiClient.listSessions(projectId);
SSEClient.apiClient.createRequest(data);
SSEClient.apiClient.approveAction(sessionId, approved);
SSEClient.apiClient.sendStepResult(sessionId, stepResult);
```

**Автоподключение** - при наличии `?session=xxx` в URL:

```javascript
// index.html?session=sess_xxx&api=/api
SSEClient.configureApi(apiBase);
SSEClient.connect(sessionId);
```

---

### 5. SessionSync ([`session-sync.js`](js/session-sync.js))

**Назначение**: Синхронизация SSE событий с SessionViewModel.

**Обработчики событий**:

| SSE Событие | Обработчик | Действие |
|-------------|------------|----------|
| `message` | [`pushMessage()`](js/session-sync.js:62) | Добавить сообщение |
| `task_response` | [`applyContext()`](js/session-sync.js:65) | Применить context + execute |
| `session_update` | [`applyContext()`](js/session-sync.js:73) | Обновить сессию |
| `progress` | [`updateProgress()`](js/session-sync.js:78) | Обновить прогресс |
| `status` | [`applyContext()`](js/session-sync.js:82) | Применить статус |
| `complete` | [`applyContext()`](js/session-sync.js:87) | Завершение + результат |
| `error` | [`pushMessage()`](js/session-sync.js:95) | Показать ошибку |
| `action_proposal` | [`applyExecute()`](js/session-sync.js:99) | Предложение действия |
| `action_executing` | [`applyExecute()`](js/session-sync.js:103) | Выполнение действия |
| `node_added` | [`applyContext()`](js/session-sync.js:107) | Добавлен нод |
| `node_updated` | [`applyContext()`](js/session-sync.js:108) | Обновлён нод |
| `edge_added` | [`applyContext()`](js/session-sync.js:109) | Добавлено ребро |

**Ключевые функции**:

| Функция | Описание |
|---------|----------|
| [`pushMessage(payload, role)`](js/session-sync.js:12) | Нормализация и добавление сообщения |
| [`applyExecute(execute)`](js/session-sync.js:19) | Применение execute к VM |
| [`applyContext(context)`](js/session-sync.js:27) | Применение context к VM |
| [`updateProgress(progressData)`](js/session-sync.js:41) | Обновление прогресса |

---

### 6. WebSocketClient ([`websocket-client.js`](js/websocket-client.js))

**Назначение**: Альтернативный протокол real-time коммуникации (bidirectional).

**Отличие от SSE**:

| SSE | WebSocket |
|-----|-----------|
| Односторонняя (сервер → клиент) | Двусторонняя |
| Автоматическое переподключение | Ручное управление |
| Легковесный | Полный дуплекс |
| EventSource API | WebSocket API |

**Подключение**:

```javascript
// URL формат: ws://host/api/ws/:sessionId
WebSocketClient.connect(sessionId, { apiBase: '/api' });
```

**Методы**:

| Метод | Описание |
|-------|----------|
| [`connect(sessionId, options)`](js/websocket-client.js:36) | Подключение |
| [`disconnect()`](js/websocket-client.js:121) | Отключение |
| [`send(type, payload)`](js/websocket-client.js:137) | Отправка сообщения |
| [`sendTask(task, options)`](js/websocket-client.js:157) | Отправка задачи |
| [`sendActionApproval(actionId, approved)`](js/websocket-client.js:168) | Подтверждение действия |
| [`sendStepResult(stepId, result)`](js/websocket-client.js:179) | Результат шага |
| [`isConnected()`](js/websocket-client.js:217) | Проверка статуса |

**Состояния соединения**:

```javascript
'disconnected' → 'connecting' → 'connected'
                        ↓
                   'error' (с автопереподключением)
```

**Heartbeat** - [`_startHeartbeat()`](js/websocket-client.js:251):

- Интервал: 30000ms (30 сек)
- Сообщение: `{ type: 'ping', timestamp: ... }`

**Message Queue** - [`_messageQueue`](js/websocket-client.js:21):

- При отключённом сокете сообщения ставятся в очередь
- [`_flushMessageQueue()`](js/session-sync.js:242) - отправка при переподключении

---

## Пожелания пользователя

### ✅ Заставить работать диалог

**Проблемы и решения**:

| Проблема | Решение |
|----------|---------|
| Сессии не загружаются | Проверить `loadSessions()` → `/api/sessions?projectId=xxx` |
| Сообщения не отображаются | Проверить `getConversation()` → `session.messages` |
| SSE не подключается | Проверить `/api/sse/:sessionId` endpoint |
| execute не обрабатывается | Использовать `processExecute()` для v2.0 протокола |

**Отладка**:

```javascript
// В консоли браузера
SessionManager.loadSessions('p_xxx').then(console.log);
SessionManager.getConversation('sess_xxx').then(console.log);

// Проверка SSE
SSEClient.connect('sess_xxx', '/api');
SSEClient.on('message', console.log);
```

---

### ✅ Тестировать вручную playwright

**Тесты в [`tests/e2e/`](tests/e2e/)**:

| Файл | Описание |
|------|----------|
| [`session-panel-smoke.spec.ts`](tests/e2e/session-panel-smoke.spec.ts) | Smoke тест панелей |
| [`sessions.spec.ts`](tests/e2e/sessions.spec.ts) | Управление сессиями |
| [`action-progress.spec.ts`](tests/e2e/action-progress.spec.ts) | Прогресс действий |
| [`messaging.spec.ts`](tests/e2e/messaging.spec.ts) | Обмен сообщениями |

**Запуск**:

```bash
cd a2a-client
npx playwright test
# или с отладкой
npx playwright test --headed
```

---

### ✅ Очистить сессии

**Расположение сессий**:

| Директория | Описание |
|------------|----------|
| `a2a-client/storage/sessions/` | JSON файлы сессий клиента |
| `a2a-server/storage/sessions/` | JSON файлы сессий сервера |

**Очистка**:

```bash
# Удалить все сессии
rm -f a2a-client/storage/sessions/p_*/sess_*.json
rm -f a2a-server/storage/sessions/p_*/sess_*.json

# Или через API (требуется запущенный сервер)
curl -X DELETE http://localhost:3001/api/sessions/all
```

**Сессии в проекте** (текущие):

```
a2a-client/storage/sessions/p_1772611112209/
├── sess_3efb3d46-fadd-400d-8b7d-dad1a59bc24a.json
├── sess_8c877dca-1bbb-4dc6-8156-d0576e873279.json
├── sess_9a033723-8f36-41c6-8e8b-0f7d36982c4a.json
├── sess_11fd6b4f-c5ba-4554-a5b8-be8647bf4ef3.json
├── sess_468c989d-0526-4e8e-8c2c-616bf48a1a90.json
├── sess_616f6d9e-d3e9-4475-b1f5-95ddb021ad6e.json
├── sess_550418aa-a889-4a5a-808f-99c2b0e9dc07.json
├── sess_3000774f-2384-414a-ba54-316ec5bbda81.json
├── sess_b3a5d40a-8793-4e9a-95c4-6f4adc79c335.json
├── sess_d2b5b669-90fb-4557-8edb-c7c875a15356.json
├── sess_dc6c5e2d-689d-4605-8942-1706dad3e3b2.json
├── sess_ebb2b90f-02b3-405f-b638-a23cba210642.json
└── sess_f9d37fb3-161d-4798-8650-31ec95f8751b.json
```

---

### ✅ Оптимизация: свёрнутые окна не грузят данные, открытое окно подгружает контент

**Проблема**: При сворачивании tab браузер выгружает данные.

**Решение - Smart Loading**:

| Состояние | Поведение |
|-----------|-----------|
| Tab активен | SSE подключён, загружаются обновления |
| Tab неактивен | SSE отключается, данные кэшируются |
| Tab становится активным | Переподключение SSE, дозагрузка изменений |

**Реализация**:

```javascript
// visibilitychange обработчик
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab скрыт - отключаем SSE
        SSEClient.disconnect();
        console.log('[UI] SSE disconnected (tab hidden)');
    } else {
        // Tab стал активным - переподключаем
        if (SessionManager.currentSessionId) {
            SSEClient.connect(SessionManager.currentSessionId);
            console.log('[UI] SSE reconnected (tab visible)');
        }
    }
});
```

**Планы оптимизации**:

| Фаза | Описание | Статус |
|------|----------|--------|
| Фаза 1 | Базовая SSE инфраструктура | ✅ Готово |
| Фаза 2 | Visibility API интеграция | 📋 Планируется |
| Фаза 3 | Lazy loading для больших диалогов | 📋 Планируется |
| Фаза 4 | Graceful degradation | 📋 Планируется |

---

### ✅ SSE тестирование вместо playwright

**Прямое SSE тестирование**:

```bash
# Подключение к SSE
curl -N http://localhost:3001/api/sse/test-session

# С токеном
curl -N "http://localhost:3001/api/sse/test-session?token=YOUR_TOKEN"
```

**Ожидаемые события**:

```javascript
// connected
event: connected
data: {"sessionId":"sess_xxx","promiseId":"promise_xxx"}

// progress
event: progress
data: {"progress":50,"step":"execute"}

// message
event: task_response
data: {"context":{...},"execute":{...},"messages":[...]}

// complete
event: complete
data: {"context":{...},"execute":{...},"result":{"message":"Done"}}
```

**JavaScript тест**:

```javascript
// Простой SSE тест
const es = new EventSource('/api/sse/test-session');
es.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
es.onerror = (e) => console.error('Error:', e);
```

**Интеграция с jest**:

```javascript
// tests/unit/sse-client.test.js
describe('SSEClient', () => {
    it('should connect and receive events', async () => {
        const events = [];
        SSEClient.on('message', (data) => events.push(data));
        SSEClient.connect('test-session');
        
        // Wait for events...
        await delay(1000);
        
        expect(events.length).toBeGreaterThan(0);
    });
});
```

---

## Протокол v2.0 (A2A)

### Action-Key Shape (обязательно)

**Правильный формат**:

```typescript
// Result
{ result: { "read-file": { path: "...", content: "..." } } }

// Execute  
{ execute: { "script": { input: {}, output: "...", code: "..." } } }
```

**Неправильный формат**:

```typescript
// ❌ Плоский content
{ result: { content: "..." } }

// ❌ generic action
{ execute: { action: "read-file", file: "..." } }
```

### Execute типы

| Тип | Направление | Описание |
|-----|-------------|----------|
| `form` | Server → Client | Интерактивная форма с choices |
| `message` | Server → Client | UI-only сообщение |
| `script` | Server → Client | Выполнение JavaScript |
| `rag-search` | Server → Client | RAG поиск |
| `read-file` | Server → Client | Чтение файла |
| `write-file` | Server → Client | Запись файла |
| `execute-command` | Server → Client | Shell команда |

---

## Отладка и диагностика

### Частые проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| `EventSource is not defined` | SSE не поддерживается | Использовать полифил |
| CORS ошибка | Неправильный origin | Настроить CORS на сервере |
| 401 Unauthorized | Токен истёк | Обновить токен |
| `maxReconnectAttempts` | Сервер недоступен | Проверить сервер |
| Сообщения не добавляются | Неправильный формат | Проверить normalizeMessage |

### Логирование

```javascript
// Включить логирование
localStorage.setItem('debug', 'true');

// Или в консоли
SSEClient.on('message', (data) => console.log('[DEBUG]', data));
SessionViewModel.on('messages', (msgs) => console.log('[VM] messages:', msgs));
```

---

## Ссылки

| Файл | Описание |
|------|----------|
| [`../a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md) | Основная документация a2a-client |
| [`../ai-integration/DEV_STATE.md`](../ai-integration/DEV_STATE.md) | AI интеграция (proxy, Ollama) |
| [`js/session-manager.js`](js/session-manager.js) | Управление сессиями |
| [`js/session-panel-manager.js`](js/session-panel-manager.js) | UI панели |
| [`js/session-view-model.js`](js/session-view-model.js) | Состояние |
| [`js/sse-client.js`](js/sse-client.js) | SSE клиент |
| [`js/session-sync.js`](js/session-sync.js) | Синхронизация |
| [`js/websocket-client.js`](js/websocket-client.js) | WebSocket |
| [`tests/e2e/sessions.spec.ts`](../tests/e2e/sessions.spec.ts) | E2E тесты |

---

## Текущие задачи

### ✅ Заставить работать диалог

**Потенциальные проблемы и решения**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **SSE соединение не устанавливается** | Высокая | Проверить `/api/sse/:sessionId` endpoint, токен аутентификации |
| **API endpoints возвращают 404/500** | Высокая | Проверить запущен ли сервер на порту 3001 |
| **Сессии не загружаются** | Средняя | Проверить `loadSessions()` → CORS, токен, projectId |
| **Сообщения не отображаются** | Средняя | Проверить `normalizeMessage()` формат, VM состояние |
| **Execute не обрабатывается** | Средняя | Проверить action-key shape, протокол v2.0 |
| **PlasticineUI не инициализируется** | Низкая | Проверить загрузку CSS/JS зависимостей |
| **WebSocket fallback не работает** | Низкая | Проверить ws:// URL, heartbeat логику |

**Отладочные команды**:
```javascript
// Быстрая диагностика в консоли браузера
SessionManager.init({apiBase: '/api'});
SessionManager.loadSessions('p_1772611112209').catch(console.error);

// Проверка SSE
SSEClient.connect('sess_xxx', '/api');
SSEClient.on('error', (err) => console.error('[SSE ERROR]', err));
SSEClient.on('connected', () => console.log('[SSE] Connected'));

// Проверка VM состояния
SessionViewModel.on('messages', (msgs) => console.log('[VM] Messages:', msgs.length));
```

---

### ✅ Тестировать вручную с playwright

**Потенциальные проблемы и решения**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Браузер не запускается** | Высокая | Проверить playwright config, системные зависимости |
| **Тесты падают на таймаутах** | Высокая | Увеличить timeout, проверить сеть |
| **Элементы не находятся** | Средняя | Проверить селекторы, DOM структура |
| **CORS/Network ошибки** | Средняя | Проверить dev server, прокси настройки |
| **Аутентификация не работает** | Средняя | Проверить токены, localStorage |
| **Флейки тесты** | Низкая | Добавить retry логику, ожидания |
| **Память/CPU исчерпана** | Низкая | Ограничить параллельность тестов |

**Запуск с отладкой**:
```bash
cd a2a-client
# С подробным выводом
npx playwright test --reporter=line --timeout=10000

# С браузером
npx playwright test sessions.spec.ts --headed --slowMo=1000

# Только smoke тесты
npx playwright test session-panel-smoke.spec.ts
```

---

### ✅ Очистить все сессии в проекте

**Потенциальные проблемы и решения**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Файлы заблокированы процессом** | Высокая | Остановить все серверы перед очисткой |
| **Разные форматы хранения** | Средняя | Проверить client/server storage пути |
| **API требует аутентификации** | Средняя | Использовать правильный токен |
| **Конкурентный доступ** | Низкая | Синхронизировать с другими тестами |
| **Потеря важных данных** | Низкая | Создать бэкап перед очисткой |
| **Частичные данные остаются** | Низкая | Проверить все storage директории |

**Безопасная очистка**:
```bash
# 1. Остановить серверы
./kill-all.bat

# 2. Создать бэкап (опционально)
cp -r a2a-client/storage/sessions backup-client-$(date +%s)
cp -r a2a-server/storage/sessions backup-server-$(date +%s)

# 3. Очистить
rm -rf a2a-client/storage/sessions/p_*/sess_*.json
rm -rf a2a-server/storage/sessions/p_*/sess_*.json

# 4. Проверить
find . -name "sess_*.json" | wc -l  # должно быть 0
```

---

### ✅ Запланировать оптимизацию получения данных с сервера

**Потенциальные проблемы и решения**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Большие payloads (1000+ сообщений)** | Высокая | Реализовать pagination/lazy loading |
| **Частые SSE обновления** | Высокая | Добавить throttling/debouncing |
| **Memory leaks в браузере** | Средняя | Ограничить размер VM.messages (max 200) |
| **Сеть медленная** | Средняя | Добавить compression, caching |
| **Concurrent SSE connections** | Низкая | Ограничить на 1 соединение per session |
| **Tab visibility не обрабатывается** | Низкая | Реализовать visibility API |
| **Браузер выгружает данные** | Низкая | Использовать IndexedDB для persistence |

**Метрики для мониторинга**:
```javascript
// В консоли браузера
performance.memory.usedJSHeapSize / 1024 / 1024 + ' MB'
SessionViewModel.getState().messages.length
SSEClient.isConnected()
```

**План оптимизации** (фазы):
1. **Фаза 1**: Ограничить messages до 200, добавить cleanup
2. **Фаза 2**: SSE throttling (max 1 event/sec)
3. **Фаза 3**: Visibility API интеграция
4. **Фаза 4**: IndexedDB persistence

---

### ✅ Запланировать SSE

**Потенциальные проблемы и решения**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Сервер не поддерживает SSE** | Высокая | Проверить EventSource API на сервере |
| **Соединение разрывается** | Высокая | Реализовать exponential backoff |
| **Слишком много соединений** | Средняя | Ограничить 1 SSE per session |
| **Events приходят не по порядку** | Средняя | Добавить sequence numbers |
| **Browser compatibility** | Низкая | Polyfill for IE/Safari |
| **Server resources exhausted** | Низкая | Connection pooling, cleanup |
| **Network proxies блокируют** | Низкая | Fallback to polling/websocket |

**SSE Architecture план**:
```javascript
// Server-side (a2a-server)
app.get('/api/sse/:sessionId', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Heartbeat каждые 30 сек
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: ping\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => clearInterval(heartbeat));
});

// Client-side
SSEClient.connect = (sessionId) => {
  const es = new EventSource(`/api/sse/${sessionId}`);
  es.onmessage = (e) => this.emit('message', JSON.parse(e.data));
  es.onerror = (e) => {
    if (this.reconnectAttempts < 5) {
      setTimeout(() => this.connect(sessionId), 3000 * Math.pow(2, this.reconnectAttempts));
    }
  };
};
```

**Тестирование SSE**:
```bash
# Простой тест
curl -N http://localhost:3001/api/sse/test-session

# С токеном
curl -N "http://localhost:3001/api/sse/test-session?token=xxx"

# В браузере
const es = new EventSource('/api/sse/test-session');
es.onmessage = (e) => console.log('SSE:', e.data);
```

---

### Дополнительные найденные проблемы

**Promise система (из TODO.md)**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Race condition в promise статусе** | Высокая | Синхронизация записи/чтения статуса |
| **Таймауты Ollama (60 сек)** | Высокая | Увеличить timeout, добавить retry |
| **Модель qwen3:8b не скачивается** | Средняя | Проверить доступность модели, fallback на другие |
| **Promise daemon polling неэффективен** | Средняя | Заменить на event-driven (Redis/RabbitMQ) |
| **409 promise_not_pending** | Средняя | Retry логика в daemon |

**Playwright конфигурация**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **webServer.command использует serve** | Высокая | Заменить на dev server (vite) для HMR |
| **Только Chromium тестируется** | Средняя | Добавить Firefox/Safari для кросс-браузерности |
| **maxFailures: 1 останавливает весь run** | Средняя | Увеличить для CI resilience |
| **reuseExistingServer: !process.env.CI** | Низкая | Проверить корректность в CI среде |

**VueFlow интеграция (TODO-vueflow-tests.md)**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Отсутствуют unit тесты для nodes** | Высокая | Реализовать TaskInputNode, ActionProposalNode тесты |
| **Protocol mapping не тестируется** | Высокая | Тесты mapSimulationResponseToFlow |
| **Flow manager не покрыт тестами** | Средняя | Тесты для addTask, loadContext, clear |
| **Интеграция с sessions.js** | Средняя | E2E тесты для VueFlow + sessions |

**API интеграция (js файлы)**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **TODO(Task-06): session view-model binding** | Высокая | Связать task-flow.js с SessionViewModel |
| **TODO(Task-07): только Client API** | Высокая | Убрать прямые вызовы a2a-server |
| **TODO(Task-09): error handling** | Средняя | Централизованный error handler для всех API |
| **Прямые server URLs в коде** | Средняя | Заменить на client-api прокси |

**Системные проблемы**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **PID файлы не очищаются** | Высокая | Улучшить kill-all.bat логику |
| **CMD обёртки не завершаются** | Средняя | Использовать taskkill /t /f |
| **Параллельные процессы конфликтуют** | Средняя | Mutex/semaphore для shared resources |
| **Логи перезаписываются** | Низкая | Timestamp в именах лог файлов |

**Архитектурные проблемы**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Polling вместо SSE в некоторых местах** | Высокая | Миграция на SSE для всех real-time обновлений |
| **Отсутствие connection pooling** | Средняя | Connection pool для SSE соединений |
| **Memory leaks в браузере** | Средняя | Профилирование, cleanup listeners |
| **Browser compatibility issues** | Низкая | Polyfills для SSE, WebSocket fallbacks |

---

## План решения найденных проблем

### 🔥 Критические (решить до тестирования)

1. **Promise система race conditions**
   - Добавить синхронизацию в set_pending_promise/get_promise_status
   - Увеличить Ollama timeout до 120 сек
   - Retry логика для 409 ошибок

2. **Playwright dev server**
   - Заменить `serve` на `vite preview` или `vite dev`
   - Проверить baseURL: `http://localhost:5173`

3. **API integration cleanup**
   - Убрать прямые a2a-server вызовы из web кода
   - Все запросы через client-api (port 3001)

### ⚠️ Высокий приоритет (во время тестирования)

4. **SSE connection stability**
   - Exponential backoff для reconnect
   - Connection pooling (max 1 per session)
   - Visibility API integration

5. **Session cleanup automation**
   - Улучшить kill-all.bat (taskkill /t /f)
   - PID файл cleanup validation
   - Backup strategy перед очисткой

6. **Error handling centralization**
   - Все API ошибки через error-handler.js
   - User-friendly сообщения в UI
   - Global notification system

### 📋 Средний приоритет (после базового тестирования)

7. **VueFlow test coverage**
   - Unit тесты для всех node компонентов
   - Protocol mapping тесты
   - Integration с sessions.js

8. **Browser compatibility**
   - Firefox/Safari playwright тесты
   - SSE polyfills для IE/legacy browsers
   - WebSocket fallback testing

9. **Performance optimization**
   - Lazy loading для больших диалогов
   - Message limit enforcement (max 200)
   - Memory leak detection

### 🔄 Низкий приоритет (оптимизации)

10. **Event-driven promise processing**
    - Redis/RabbitMQ для queue management
    - Убрать polling из daemon
    - Real-time metrics

11. **Advanced error recovery**
    - Graceful degradation modes
    - Offline queue processing
    - Smart retry strategies

---

## Риски и mitigation

| Риск | Вероятность | Mitigation |
|------|-------------|------------|
| **SSE connections overwhelm server** | Средняя | Connection limits, monitoring |
| **Browser memory leaks** | Высокая | Message cleanup, profiling |
| **Promise system deadlocks** | Средняя | Timeout handling, circuit breaker |
| **Test flakiness** | Высокая | Retry logic, stable selectors |
| **API breaking changes** | Низкая | Version pinning, compatibility layer |

---

## Дополнительные найденные проблемы

### 🔥 Security & Dependencies

**Уязвимости в зависимостях**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **esbuild vulnerability (GHSA-67mh-4wv8-2f99)** | Высокая | Обновить vite до 7.3.1+ (breaking change) |
| **Dev server позволяет external requests** | Высокая | Настроить host binding в dev mode |
| **Hardcoded secrets в .env.example** | Средняя | Использовать placeholder values |
| **CORS headers отсутствуют** | Средняя | Добавить CORS middleware |

**Безопасность кода**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **60+ console.log/error в production** | Высокая | Убрать все console из web кода |
| **No input sanitization** | Средняя | Добавить HTML sanitization |
| **Missing CSP headers** | Средняя | Настроить Content Security Policy |
| **WebSocket без origin validation** | Низкая | Добавить origin checks |

### ⚠️ Performance & Memory

**Memory leaks**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **30+ setTimeout/setInterval без cleanup** | Высокая | Добавить proper cleanup в destroy |
| **Event listeners not removed** | Высокая | Implement proper teardown |
| **SSE connections not closed** | Средняя | Visibility API + cleanup |
| **DOM nodes not removed** | Средняя | Memory profiling, garbage collection |

**Performance bottlenecks**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **No lazy loading for messages** | Высокая | Virtual scrolling для больших диалогов |
| **Blocking DOM operations** | Средняя | Web Workers для heavy computations |
| **No caching for API responses** | Средняя | Service Worker caching |
| **Large bundle size** | Низкая | Code splitting, tree shaking |

### 📋 Code Quality & Architecture

**TypeScript & Configuration**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **exactOptionalPropertyTypes: false** | Средняя | Включить strict optional properties |
| **noUncheckedIndexedAccess: true** | Низкая | Добавить proper bounds checking |
| **Docker version '3.8' deprecated** | Низкая | Обновить до 3.9+ |
| **Missing health checks** | Средняя | Добавить comprehensive health endpoints |

**Architecture issues**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **Mixed sync/async patterns** | Средняя | Стандартизировать на async/await |
| **Global state mutations** | Высокая | Redux/Vuex для state management |
| **Tight coupling between components** | Средняя | Dependency injection |
| **No error boundaries** | Средняя | React error boundaries equivalent |

### 🔄 DevOps & CI/CD

**Docker & Deployment**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **No resource limits in docker-compose** | Средняя | Добавить memory/cpu limits |
| **Volumes not cleaned up** | Низкая | Proper volume management |
| **No health checks in docker-compose** | Средняя | Добавить health checks для всех services |
| **Missing restart policies** | Низкая | Добавить restart: unless-stopped |

**Monitoring & Observability**:

| Проблема | Вероятность | Решение |
|----------|-------------|---------|
| **No client-side error tracking** | Высокая | Sentry/Bugsnag integration |
| **Missing performance metrics** | Средняя | Web Vitals tracking |
| **No user analytics** | Низкая | Basic usage tracking |
| **Log aggregation missing** | Средняя | Centralized logging |

---

## Итоговый план решения (расширенный)

### 🚨 КРИТИЧЕСКИЕ (решить ДО тестирования)

1. **Security vulnerabilities**
   - Обновить esbuild/vite до secure versions
   - Убрать все console.log из production кода
   - Настроить CORS и CSP headers

2. **Memory leaks & performance**
   - Очистить все setTimeout/setInterval в destroy
   - Добавить proper event listener cleanup
   - Implement message limits (max 200)

3. **Architecture fixes**
   - Исправить promise race conditions
   - Убрать прямые server API calls из web
   - Реализовать session view-model binding

### ⚡ ВЫСОКИЙ ПРИОРИТЕТ (во время тестирования)

4. **Playwright & testing**
   - Исправить dev server configuration
   - Добавить Firefox/Safari тесты
   - Убрать flaky timeouts

5. **SSE & real-time**
   - Connection pooling (max 1 per session)
   - Exponential backoff для reconnect
   - Visibility API integration

6. **Error handling**
   - Централизованный error handler
   - User-friendly error messages
   - Global notification system

### 📈 СРЕДНИЙ ПРИОРИТЕТ (после базового тестирования)

7. **Code quality**
   - TypeScript strict mode improvements
   - Input sanitization
   - Error boundaries implementation

8. **Performance optimization**
   - Lazy loading для messages
   - Virtual scrolling
   - Bundle size optimization

9. **DevOps improvements**
   - Docker resource limits
   - Health checks для всех services
   - Centralized logging

### 🎯 НИЗКИЙ ПРИОРИТЕТ (оптимизации)

10. **Monitoring & analytics**
    - Error tracking (Sentry)
    - Performance metrics (Web Vitals)
    - Usage analytics

11. **Advanced features**
    - Offline queue processing
    - Smart retry strategies
    - Progressive Web App features

---

## Метрики успеха

| Метрика | Цель | Текущее значение | Target |
|---------|------|------------------|--------|
| **Security vulnerabilities** | 0 high/critical | 2 moderate | 0 |
| **Memory leaks** | None detectable | Unknown | 0 |
| **Test flakiness** | <5% failure rate | Unknown | <2% |
| **Bundle size** | <2MB gzipped | Unknown | <1.5MB |
| **Lighthouse score** | >90 | Unknown | >95 |
| **Time to interactive** | <3 seconds | Unknown | <2 seconds |
