# План исправлений: Client и Web UI в соответствии с протоколами A2A

## 1. Краткое описание проблемы

**Критическое несоответствие протоколу:** `execute.ui` не реализован в SDK

Согласно протоколу A2A, Client API (a2a-client/packages/sdk) должен генерировать UI команды на основе статуса polling и передавать их в Web UI. В текущей реализации:

1. **SDK** делает polling на сервер, но **НЕ генерирует и не передает `execute.ui`** в Web UI
2. **Web UI** самостоятельно делает polling (дублирование логики)
3. **Server** возвращает только `promiseId` + `status` — это корректно по протоколу

---

## 2. Текущее состояние

### Диаграмма текущего потока данных

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ТЕКУЩЕЕ СОСТОЯНИЕ                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐     POST /invoke      ┌──────────┐     promiseId      ┌─────────┐
│   Web    │ ──────────────────►   │   SDK    │ ───────────────► │ Server  │
│   UI     │                      │ (temp.ts)│                   │         │
└──────────┘                      └──────────┘                   └─────────┘
       │                                │                                  │
       │                                │◄───────── status ◄──────────────┤
       │                                │                                  │
       │◄── promiseId (только) ──────────┤                                  │
       │                                │                                  │
       │      DUPLICATE POLLING         │                                  │
       │◄── /v1/requests/:id/status ──►│                                  │
       │◄── /v1/requests/:id/result ───►│                                  │
       │                                │                                  │
       │  ❌ НЕТ execute.ui от SDK      │                                  │
       │  ❌ Дублирование polling       │                                  │
       └────────────────────────────────┘                                  │

```

### Проблемы в текущей реализации:

| Компонент | Файл | Проблема |
|-----------|------|----------|
| SDK | [`temp.ts`](a2a-client/packages/sdk/temp.ts:862-900) | При получении `promiseId` не генерирует `execute.ui`, только broadcasteт promiseId |
| SDK | [`temp.ts`](a2a-client/packages/sdk/temp.ts:1340-1470) | Polling логика есть, но результаты не включают `execute.ui` |
| Web UI | [`api-integration.js`](a2a-client/web/js/api-integration.js:201-267) | Самостоятельно делает polling — дублирование логики |
| Web UI | [`progress-indicators.js`](a2a-client/web/js/progress-indicators.js:524-615) | Еще один独立的 polling — полное дублирование |

---

## 3. Ожидаемое состояние по протоколу

### Диаграмма ожидаемого потока данных

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ОЖИДАЕМОЕ СОСТОЯНИЕ                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐     POST /invoke      ┌──────────┐     promiseId      ┌─────────┐
│   Web    │ ──────────────────►   │   SDK    │ ───────────────► │ Server  │
│   UI     │                      │ (temp.ts)│                   │         │
└──────────┘                      └──────────┘                   └─────────┘
       │                                │                                  │
       │                                │◄───────── status ◄──────────────┤
       │                                │                                  │
       │◄── promiseId + execute.ui ─────┤  ✅ SDK генерирует execute.ui  │
       │     (через SSE/WS)             │     на основе статуса polling  │
       │                                │                                  │
       │                                │◄───────── result ◄───────────────┤
       │                                │                                  │
       │◄── result + execute.ui ────────┤  ✅ SDK передает финальный     │
       │     (через SSE/WS)             │     результат + execute.ui     │
       │                                │                                  │
       │  ✅ НЕТ дублирующего polling   │                                  │
       └────────────────────────────────┘                                  │

```

### Ожидаемое поведение по протоколу:

1. **SDK** при получении `promiseId` от Server:
   - Начинает polling
   - Генерирует `execute.ui` с `state: "waiting"` при каждом опросе
   - Передает `execute.ui` в Web UI через SSE/WebSocket

2. **SDK** при завершении (status: "completed"):
   - Получает result от Server
   - Генерирует `execute.ui` с `state: "success"`
   - Передает result + `execute.ui` в Web UI

3. **Web UI**:
   - Прекращает самостоятельный polling
   - Ожидает `execute.ui` от SDK
   - Отображает UI состояния на основе `execute.ui`

---

## 4. Список исправлений для SDK (a2a-client/packages/sdk)

### 4.1. Основной файл: temp.ts

#### Изменение 1: Добавить генерацию execute.ui при получении promiseId

**Файл:** [`temp.ts`](a2a-client/packages/sdk/temp.ts:1166-1183)

**Текущий код:**
```typescript
// Handle async response (promiseId)
const promiseId: string | undefined = payload?.data?.promiseId || payload?.promiseId;
if (promiseId) {
    const updated: Session = {
        ...session,
        lastPromiseId: promiseId,
        status: 'IN_PROGRESS',
    };

    // Broadcast promiseId to Web UI via WebSocket
    broadcastProgress(sessionId, {
        promiseId,
        status: 'promise_id_assigned',
        message: `New promiseId assigned: ${promiseId}`,
        result: { promiseId, sessionId },
    });
    emitServerSse(sessionId, { promiseId, sessionId }, 'status');
    return;
}
```

**Ожидаемый код:**
```typescript
// Handle async response (promiseId)
const promiseId: string | undefined = payload?.data?.promiseId || payload?.promiseId;
if (promiseId) {
    const updated: Session = {
        ...session,
        lastPromiseId: promiseId,
        status: 'IN_PROGRESS',
    };

    // ✅ Generate execute.ui for Web UI
    const uiCommand = {
        execute: {
            ui: {
                state: 'waiting',
                message: 'AI обрабатывает ваш запрос...',
                spinner: true,
                progress: 0
            }
        }
    };

    // Broadcast promiseId + execute.ui to Web UI
    broadcastProgress(sessionId, {
        promiseId,
        status: 'promise_id_assigned',
        message: `New promiseId assigned: ${promiseId}`,
        result: { promiseId, sessionId },
    });
    
    // ✅ Send execute.ui with promiseId
    emitServerSse(sessionId, { 
        promiseId, 
        sessionId,
        ...uiCommand  // ✅ Include execute.ui
    }, 'status');
    return;
}
```

#### Изменение 2: Добавить execute.ui в polling loop

**Файл:** [`temp.ts`](a2a-client/packages/sdk/temp.ts:1340-1420)

**Текущий код:**
```typescript
// Poll status endpoint first
const statusUrl = `${serverBase.replace(/\/?$/, '')}/requests/${promiseId}/status`;
const statusResponse = await fetch(statusUrl, { ... });
const statusData = await statusResponse.json();
const st = statusData?.data ?? statusData;

if (st.status === 'completed') {
    // Request completed - get the full result
    const resultUrl = `${serverBase.replace(/\/?$/, '')}/requests/${promiseId}/result`;
    const resultResponse = await fetch(resultUrl, { ... });
    const resultPayload = await resultResponse.json();
    
    if (resultPayload?.data) {
        let syncResult = resultPayload.data;
        // ...
        broadcastProgress(session.id, {
            status: 'sync_response',
            message: 'Synchronous response received via polling',
            result: syncResponse,
        });
    }
}
```

**Ожидаемый код:**
```typescript
// Poll status endpoint first
const statusUrl = `${serverBase.replace(/\/?$/, '')}/requests/${promiseId}/status`;
const statusResponse = await fetch(statusUrl, { ... });
const statusData = await statusResponse.json();
const st = statusData?.data ?? statusData;

// ✅ Calculate progress based on status
let progress = 0;
let state = 'waiting';
let message = 'AI обрабатывает ваш запрос...';

if (st.status === 'completed') {
    state = 'success';
    message = 'Запрос выполнен';
    progress = 100;
    
    // Request completed - get the full result
    const resultUrl = `${serverBase.replace(/\/?$/, '')}/requests/${promiseId}/result`;
    const resultResponse = await fetch(resultUrl, { ... });
    const resultPayload = await resultResponse.json();
    
    if (resultPayload?.data) {
        let syncResult = resultPayload.data;
        // ...
        
        // ✅ Generate execute.ui for completion
        const uiCommand = {
            execute: {
                ui: {
                    state: 'success',
                    message: 'Запрос выполнен успешно',
                    progress: 100
                }
            }
        };
        
        broadcastProgress(session.id, {
            status: 'sync_response',
            message: 'Synchronous response received via polling',
            result: syncResponse,
        });
        
        // ✅ Send result with execute.ui
        emitServerSse(session.id, {
            sessionId: session.id,
            promiseId,
            ...uiCommand,
            result: syncResponse
        }, 'task_response');
    }
} else if (st.status === 'failed') {
    // ✅ Generate execute.ui for error
    const uiCommand = {
        execute: {
            ui: {
                state: 'error',
                message: st.error?.message || 'Ошибка выполнения',
                errorCode: st.error?.code
            }
        }
    };
    
    emitServerSse(session.id, {
        sessionId: session.id,
        promiseId,
        ...uiCommand,
        error: st.error
    }, 'task_response');
} else {
    // ✅ Generate execute.ui for progress (waiting)
    const progressStates = ['waiting', 'processing'];
    const currentProgress = progressStates.index /Of(st.status) progressStates.length * 100;
    
    const uiCommand = {
        execute: {
            ui: {
                state: st.status === 'processing' ? 'processing' : 'waiting',
                message: st.message || 'AI обрабатывает...',
                spinner: true,
                progress: currentProgress
            }
        }
    };
    
    // ✅ Send progress with execute.ui
    emitServerSse(session.id, {
        sessionId: session.id,
        promiseId,
        ...uiCommand,
        status: st.status
    }, 'status');
}
```

#### Изменение 3: Обновить broadcastProgress для включения execute.ui

**Файл:** [`temp.ts`](a2a-client/packages/sdk/temp.ts:310-330)

**Текущий код:**
```typescript
function broadcastProgress(sessionId: string, progress: {
    promiseId?: string;
    status: string;
    ...
}): void {
    ...
    sendSseEvent(sessionId, 'progress', {
        timestamp: new Date().toISOString(),
        ...
    });
}
```

**Ожидаемый код:**
```typescript
function broadcastProgress(sessionId: string, progress: {
    promiseId?: string;
    status: string;
    execute?: { ui: { state: string; message?: string; progress?: number; spinner?: boolean } };
    ...
}): void {
    ...
    sendSseEvent(sessionId, 'progress', {
        timestamp: new Date().toISOString(),
        execute: progress.execute,  // ✅ Include execute.ui in broadcast
        ...
    });
}
```

### 4.2. Файл polling.ts

#### Изменение 4: Обновить PollCallbacks для поддержки execute.ui

**Файл:** [`src/polling.ts`](a2a-client/packages/sdk/src/polling.ts:1-50)

**Добавить в интерфейс:**
```typescript
interface PollCallbacks {
    onStatus?: (status: { status: string; progress?: number; message?: string }) => void;
    onProgress?: (progress: { 
        promiseId: string; 
        status: string;
        execute?: { ui: { state: string; message?: string; progress?: number } };
    }) => void;
    onComplete?: (result: unknown) => void;
    onError?: (error: { message: string }) => void;
}
```

---

## 5. Список исправлений для Web UI (a2a-client/web)

### 5.1. Основной файл: api-integration.js

#### Изменение 1: Удалить самостоятельный polling

**Файл:** [`api-integration.js`](a2a-client/web/js/api-integration.js:201-267)

**Текущий код (полностью удалить):**
```javascript
_startPromisePolling(promiseId) {
    const pollInterval = 2000;
    const maxAttempts = 60;
    let attempts = 0;
    
    console.log('[api-integration] Starting poll for:', promiseId);
    
    const intervalId = setInterval(async () => {
        attempts++;
        // ... полная логика polling
    }, pollInterval);
}
```

**Ожидаемый код (удалить метод):**
```javascript
// ❌ POLLING REMOVED - SDK now handles polling and sends execute.ui
// Web UI receives execute.ui via SSE/WebSocket from SDK
```

#### Изменение 2: Обработка execute.ui от SDK

**Файл:** [`api-integration.js`](a2a-client/web/js/api-integration.js:160-196)

**Добавить обработку execute.ui после получения результата:**

```javascript
const result = await this.request('POST', '/v1/invoke', requestData);

this.currentPromiseId = result.promiseId || result.promise_id;

// ✅ Handle execute.ui from SDK (sent via SSE/WS)
// SDK now sends execute.ui with state: "waiting" when promiseId is returned
if (result.execute?.ui) {
    console.log('[api-integration] Received execute.ui from SDK:', result.execute.ui);
    this.emit('uiStateChange', { 
        promiseId: this.currentPromiseId, 
        ui: result.execute.ui 
    });
    
    // Forward to SessionStore for UI rendering
    const root = typeof window !== 'undefined' ? window : globalThis;
    root.SessionStore?.applyServerResponse?.({
        execute: result.execute
    });
}

// ✅ No more manual polling - SDK sends progress updates via SSE/WS
```

### 5.2. Файл: progress-indicators.js

#### Изменение 3: Удалить дублирующий polling

**Файл:** [`progress-indicators.js`](a2a-client/web/js/progress-indicators.js:524-615)

**Текущий код (удалить):**
```javascript
pollPromiseId(sessionId, promiseId, progressId) {
    const sessionInfo = this._activeSessions.get(progressId);
    // ... полная логика polling
}
```

**Ожидаемый код:**
```javascript
// ❌ POLLING REMOVED - SDK now handles polling and sends execute.ui via SSE/WS
// This method should be removed or converted to handle incoming execute.ui from SDK

async handleUiStateFromSdk(uiState) {
    // ✅ New method: handle execute.ui sent by SDK
    const { promiseId, execute } = uiState;
    
    if (execute?.ui) {
        const tracker = await this.startSessionProgress(
            this._getSessionIdForPromise(promiseId),
            'sdk_ui'
        );
        
        tracker.update({
            status: execute.ui.state,
            message: execute.ui.message,
            progress: execute.ui.progress,
            spinner: execute.ui.spinner
        });
        
        if (execute.ui.state === 'success' || execute.ui.state === 'error') {
            tracker.complete();
        }
    }
}
```

### 5.3. Подписка на SSE от SDK

**Файл:** [`api-integration.js`](a2a-client/web/js/api-integration.js:100-150)

**Добавить подписку на события от SDK:**

```javascript
/**
 * Setup SSE listener for execute.ui from SDK
 */
_setupSseListener() {
    // Listen for execute.ui from SDK (sent via SSE)
    const eventSource = new EventSource('/api/sse');
    
    eventSource.addEventListener('status', (event) => {
        const data = JSON.parse(event.data);
        
        // ✅ Handle execute.ui in status events
        if (data.execute?.ui) {
            this.emit('uiStateChange', {
                promiseId: data.promiseId,
                ui: data.execute.ui
            });
        }
    });
    
    eventSource.addEventListener('task_response', (event) => {
        const data = JSON.parse(event.data);
        
        // ✅ Handle execute.ui in final response
        if (data.execute?.ui) {
            this.emit('uiStateChange', {
                promiseId: data.promiseId,
                ui: data.execute.ui
            });
            
            this.emit('taskCompleted', { 
                promiseId: data.promiseId, 
                result: data.result 
            });
        }
    });
}
```

---

## 6. Приоритеты исправлений

### 🔴 Критические (обязательно для исправления)

| # | Задача | Компонент | Файл | Строки |
|---|--------|-----------|------|--------|
| 1 | Добавить генерацию execute.ui при promiseId | SDK | [`temp.ts`](a2a-client/packages/sdk/temp.ts:1166-1183) | 1166-1183 |
| 2 | Добавить execute.ui в polling results | SDK | [`temp.ts`](a2a-client/packages/sdk/temp.ts:1340-1420) | 1340-1420 |
| 3 | Удалить дублирующий polling из api-integration.js | Web UI | [`api-integration.js`](a2a-client/web/js/api-integration.js:201-267) | 201-267 |
| 4 | Добавить обработку execute.ui от SDK | Web UI | [`api-integration.js`](a2a-client/web/js/api-integration.js:168-180) | 168-180 |

### 🟠 Важные (рекомендуется)

| # | Задача | Компонент | Файл | Строки |
|---|--------|-----------|------|--------|
| 5 | Обновить broadcastProgress для включения execute.ui | SDK | [`temp.ts`](a2a-client/packages/sdk/temp.ts:310-330) | 310-330 |
| 6 | Удалить polling из progress-indicators.js | Web UI | [`progress-indicators.js`](a2a-client/web/js/progress-indicators.js:524-615) | 524-615 |
| 7 | Обновить PollCallbacks для поддержки execute.ui | SDK | [`src/polling.ts`](a2a-client/packages/sdk/src/polling.ts:1-50) | 1-50 |

### 🟢 Желательные

| # | Задача | Компонент | Файл | Строки |
|---|--------|-----------|------|--------|
| 8 | Добавить SSE listener для execute.ui | Web UI | [`api-integration.js`](a2a-client/web/js/api-integration.js:100-150) | 100-150 |
| 9 | Добавить обработку состояний error/success | SDK | [`temp.ts`](a2a-client/packages/sdk/temp.ts:1420-1470) | 1420-1470 |

---

## 7. Порядок выполнения

### Фаза 1: SDK исправления (приоритет 🔴)

1. **Шаг 1.1:** Модифицировать [`temp.ts`](a2a-client/packages/sdk/temp.ts:1166-1183) — добавить `execute.ui` при первом получении `promiseId`
2. **Шаг 1.2:** Модифицировать [`temp.ts`](a2a-client/packages/sdk/temp.ts:1340-1420) — добавить `execute.ui` в polling results (waiting, processing, success, error)
3. **Шаг 1.3:** Обновить [`temp.ts`](a2a-client/packages/sdk/temp.ts:310-330) — `broadcastProgress` для передачи `execute.ui`

### Фаза 2: Web UI исправления (приоритет 🔴)

4. **Шаг 2.1:** Удалить [`_startPromisePolling()`](a2a-client/web/js/api-integration.js:201-267) из `api-integration.js`
5. **Шаг 2.2:** Добавить обработку `execute.ui` при получении ответа от SDK
6. **Шаг 2.3:** Удалить [`pollPromiseId()`](a2a-client/web/js/progress-indicators.js:524-615) из `progress-indicators.js`

### Фаза 3: Интеграция (приоритет 🟠)

7. **Шаг 3.1:** Добавить SSE listener для событий от SDK
8. **Шаг 3.2:** Обновить PollCallbacks в [`src/polling.ts`](a2a-client/packages/sdk/src/polling.ts:1-50)
9. **Шаг 3.3:** Протестировать end-to-end поток

### Фаза 4: Тестирование (приоритет 🟢)

10. **Шаг 4.1:** Запустить симуляцию и проверить получение `execute.ui` в Web UI
11. **Шаг 4.2:** Проверить отсутствие дублирующего polling
12. **Шаг 4.3:** Проверить все состояния UI (waiting, processing, success, error)

---

## 8. Проверка результатов

После выполнения всех исправлений должен работать следующий сценарий:

```
1. Web UI отправляет POST /invoke
2. SDK получает promiseId от Server
3. SDK генерирует execute.ui: { state: "waiting", spinner: true }
4. SDK отправляет { promiseId, execute: { ui: {...} } } в Web UI через SSE
5. Web UI отображает спиннер/сообщение
6. SDK делает polling /requests/:id/status
7. SDK получает status: "completed"
8. SDK генерирует execute.ui: { state: "success", progress: 100 }
9. SDK отправляет { result, execute: { ui: {...} } } в Web UI через SSE
10. Web UI отображает успешное завершение
```

**НЕ должно быть:**
- Двух одновременных polling (SDK + Web UI)
- Отсутствия execute.ui в ответах от SDK
- Ручного polling в Web UI

---

## 9. Ссылки на протоколы

- [UI Commands Schema](docs/new-request-flow/json-schemas/UI-COMMANDS.md)
- [Promise System](docs/new-request-flow/PROTOCOLS/promise/)
- [Session Management](docs/new-request-flow/PROTOCOLS/sessions/)
- [States: Waiting](docs/new-request-flow/PROTOCOLS/states/waiting.md)
- [States: Completed](docs/new-request-flow/PROTOCOLS/states/completed.md)
