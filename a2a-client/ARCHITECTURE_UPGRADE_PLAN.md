# Architecture Upgrade Plan (modular daemons)

> Cross-stack plan: explicit hierarchy, **background loops per subsystem** (web, client API, A2A server, AI integration), and clear roles Client → Server → Proxy → LLM.

**Created:** 2026-03-20  
**Updated:** 2026-03-21  
**Status:** Draft

---

## Цель

Make the stack **obvious and modular** by:
1. Naming every long-running / periodic responsibility (“daemon” = timer loop, poller, or background tick—not necessarily an OS service).
2. Mapping each daemon to **one bounded module** with a single outward contract.
3. Keeping the data path clear: **Web → Client API → A2A Server → AI integration → LLM**, with polling only where the protocol requires it.

---

## Definition: “Daemon” in this repo

| Property | Meaning |
|----------|---------|
| **Trigger** | `setInterval` / `setTimeout` chain / tight poll loop in async function |
| **Purpose** | Progress async work, recover state, or enforce UX timing (e.g. minimum loader time) |
| **Rule** | Each daemon owns **one concern**; callers subscribe via events or await a single API |

---

## Daemons by subsystem

### 1. Web (`a2a-client/web/js`)

| Daemon / loop | Location (approx.) | Role | Modular extract |
|---------------|-------------------|------|-----------------|
| **DialogLoader** | `session-store.js` (`createDialogLoader`) | Enforces minimum loader visibility (5s) via deferred `_forceStop` | `web/js/daemons/dialog-loader.js` — `start()` / `stop()` / events |
| **DialogPromise (browser poll)** | `session-store.js` (`createDialogPromise`, `PROMISE_POLL_INTERVAL`) | Polls Client API until step completes (5s interval); emits `resolved` / `rejected` | `web/js/daemons/dialog-promise-poll.js` — inject `checkFn`, interval, cancel |
| **Taskbar / off-screen refresh** | `app/taskbar-manager.js` | 1s interval for scroll hint UI | `web/js/daemons/ui-refresh-tick.js` or fold into taskbar module only |
| **Restore pending promises** | `app/app-task.js` → `SessionStore.restorePendingPromises` | On load, resume polling for unfinished server promises | keep entry in `app-task.js`, implementation in `dialog-promise-poll` |

**Boundary:** Web **never** calls A2A Server or Ollama directly; it only talks to **Client API** and runs UX timers.

---

### 2. Client API (`a2a-client/vite-plugin-a2a`)

| Daemon / loop | Location | Role | Modular extract |
|---------------|----------|------|-----------------|
| **Promise polling (invoke result)** | `routes/proxy/a2a-proxy.js`, `routes/stepRoutes.js` | After `promiseId` from `/api/v1/invoke`, polls `/api/v1/requests/:id/result` (~1s, bounded retries) until completed/failed | `vite-plugin-a2a/daemon/polling-loop.js` (see existing plan below) |
| **(Future) daemon stats** | — | Optional metrics for active polls | `GET /api/a2a/daemon/stats` |

**Boundary:** Client API is the **only** Node side that should implement tight polling toward **A2A Server** for the Vite dev session store flow.

---

### 3. A2A Server (`a2a-server`)

| Daemon / loop | Location | Role | Modular extract |
|---------------|----------|------|-----------------|
| **Request processor tick** | `services/core/request-processor/request-processor.service.ts` (`startRequestProcessor`, default **5s**) | Dequeues pending requests, runs `processOneRequest`, schedules retries when idle | Already centralized; expose `RequestProcessorDaemon` facade if splitting files |
| **Recovery on startup** | Same file (`recoverProcessingRequests`) | Rebinds `llmPromiseId` after restart via AI Hub lookup | Keep with processor or `recovery/llm-promise-recovery.ts` |
| **Dialog → LLM poll** | `dialog-request-processor.ts` (`pollReadyThenFetch`, 500ms interval, ~200s timeout) | Polls AI Hub until LLM artifact ready | `daemons/llm-ready-poll.ts` |
| **Logger maintenance** | `utils/logger.ts` | Periodic performance + log cleanup | `infra/logger-scheduler.ts` |
| **Execute security cleanup** | `execute-security.service.ts` | Periodic cleanup interval | colocate with service or small `cleanup-tick` helper |

**Boundary:** Server **orchestrates** work and talks to **AI Hub**; it does not replace the browser’s or Client API’s polling of `/requests/:id/result` for the same concern on different hops.

---

### 4. AI integration (Python proxy, repo `ai-integration`)

| Daemon / loop | Role | Modular extract |
|---------------|------|-----------------|
| **HTTP app + route handlers** | Serves `/health`, promise lifecycle, forwards to Ollama | `app.py` / `proxy/*` — keep **promise queue + worker** separate from Flask view layer |
| **Async LLM job / promise completion** | Long-running inference; status readable until `completed` | **Promise daemon**: one module owns “submit → poll Ollama / stream → complete promise” |
| **Ollama manager (if present)** | Process lifecycle / readiness | Isolate in `ollama_manager` (already referenced in AGENTS.md) |

**Boundary:** AI integration is an **adapter** to external LLM; A2A Server treats it as **HTTP + promise ids**, not as shared memory.

---

## Modular layering

**Implemented in repo:**

```
web/js/daemons/{emitter,dialog-loader,dialog-promise-poll}.js  ← window.__a2aDaemons
vite-plugin-a2a/daemon/a2a-result-poll.js                         ← poll A2A /requests/:id/result
a2a-server/src/daemon/request-processor-daemon.ts                 ← re-exports queue tick API
```

**Still external / planned:** `ai-integration` promise worker as its own module tree; server `llm-ready-poll` remains inside `dialog-request-processor.ts` until extracted.

Shared **types** (status enums, poll outcomes) can live in `a2a-client/packages/types` or `a2a-server` contracts—avoid duplicating three different “completed” shapes.

---

## Текущая проблема

### Неявная архитектура

```
Browser (web/js) → ??? → Client API (vite-plugin-a2a) → ??? → A2A Server → ??? → AI Proxy
```

**Проблемы:**
- Daemon-компонент не описан явно (в т.ч. **web** и **a2a-server** loops)
- Роль polling не документирована на каждом hop (browser vs client vs server vs AI)
- Непонятно, кто долбит A2A Server снаружи (Client API) vs кто долбит AI Hub изнутри (Server)

---

## Целевая архитектура

### Иерархия компонентов (все daemons на одной схеме)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ BROWSER (Web)                                                             │
│  task-flow/core.js — orchestration                                        │
│  session-store.js — DialogLoader (min 5s), DialogPromise poll (5s→API)   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP /api/a2a/*
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CLIENT API (Vite plugin)                                                  │
│  stepRoutes / sessionRoutes — REST + step storage                         │
│  DAEMON: a2a-proxy pollPromise — 1s → GET A2A /requests/:id/result        │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP → A2A Server :3000
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ A2A SERVER                                                                │
│  /api/v1/invoke, /api/v1/requests/:id/result                              │
│  DAEMON: request-processor tick (5s) — queue + retry + recovery         │
│  DAEMON: dialog LLM poll (500ms) — poll AI Hub until artifact ready      │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP → AI Hub :11435
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ AI INTEGRATION (Python)                                                   │
│  promise + LLM routes — adapter; internal worker until Ollama completes  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP → Ollama :11434
                                ▼
                          OLLAMA (LLM)
```

---

## Daemon-компонент: Client API — Promise Polling Loop

*(One of four subsystem daemons; see [Daemons by subsystem](#daemons-by-subsystem).)*

### Расположение

**Файл:** `vite-plugin-a2a/routes/proxy/a2a-proxy.js`

### Роль

**Daemon долбит A2A Server** для проверки статуса async операций:

```javascript
async function pollPromise(promiseId, maxPolls = 30) {
    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 1000)); // 1s interval
        const res = await fetch(`${A2A_URL}/api/v1/requests/${promiseId}/result`);
        const data = await res.json();
        
        if (data.data?.status === 'completed') return data.data;
        if (data.data?.status === 'failed') break;
    }
    return null;
}
```

### Характеристики

| Параметр | Значение |
|----------|----------|
| Интервал | 1000ms (1 секунда) |
| Timeout | 30 секунд (30 polls) |
| Endpoint | `/api/v1/requests/:promiseId/result` |
| Триггер | A2A Server возвращает `promiseId` |

### Где используется

1. **stepRoutes.js:276** - после POST `/api/v1/invoke`
2. **a2a-proxy.js:21** - в `proxyToA2AServer()`

---

## Поток данных: User Input → LLM Response

### Шаг 1: User отправляет сообщение

```
Browser (task-flow/core.js)
  → POST /api/a2a/sessions/{id}/next
  → body: { result: { message: "user input" } }
```

### Шаг 2: Client API обрабатывает запрос

```
vite-plugin-a2a/routes/stepRoutes.js:nextMatch
  → Сохраняет client-result.json
  → Строит context из предыдущего шага
  → POST http://localhost:3000/api/v1/invoke
  → body: { context, result }
```

### Шаг 3: A2A Server возвращает promiseId

```
A2A Server (/api/v1/invoke)
  → Создает async задачу
  → Возвращает: { data: { promiseId: "uuid" } }
```

### Шаг 4: DAEMON начинает polling

```
vite-plugin-a2a/routes/stepRoutes.js:276
  → Сохраняет server-promise.json
  → Запускает polling loop (30 секунд max)
  → GET http://localhost:3000/api/v1/requests/{promiseId}/result
  → Каждую 1 секунду
```

### Шаг 5: A2A Server долбит AI Proxy

```
A2A Server (внутри async задачи)
  → POST http://localhost:11434/api/llm/invoke
  → AI Proxy долбит Ollama
  → Ollama возвращает LLM response
```

### Шаг 6: DAEMON получает результат

```
vite-plugin-a2a/routes/stepRoutes.js:285
  → Polling обнаруживает execute != null
  → Сохраняет server-response.json
  → Обновляет session.json
  → Возвращает в Browser
```

### Шаг 7: Browser отображает ответ

```
Browser (task-flow/core.js)
  → Получает execute: { message, form }
  → Рендерит UI через task-flow/render.js
```

---

## Задачи по улучшению

### 1. Документация daemon-компонента

**Файл:** `vite-plugin-a2a/routes/proxy/README.md`

**Содержание:**
- Роль polling loop
- Параметры (interval, timeout)
- Диаграмма взаимодействия
- Обработка ошибок

**Приоритет:** High  
**Оценка:** 1 час

---

### 2. Рефакторинг: выделить daemon в отдельный модуль

**Текущее состояние:**
- Polling логика размазана по `stepRoutes.js` (строки 276-310)
- Дублирование в `a2a-proxy.js`

**Целевое состояние:**

```
vite-plugin-a2a/daemon/
  ├── polling-loop.js      # Основной polling механизм
  ├── promise-tracker.js   # Отслеживание активных промисов
  └── README.md            # Документация daemon
```

**Интерфейс:**

```javascript
// polling-loop.js
export class PollingDaemon {
    constructor(config = {}) {
        this.interval = config.interval || 1000;
        this.maxPolls = config.maxPolls || 30;
        this.serverUrl = config.serverUrl || 'http://localhost:3000';
    }

    async pollPromise(promiseId, onProgress) {
        for (let i = 0; i < this.maxPolls; i++) {
            await this._sleep(this.interval);
            const result = await this._checkStatus(promiseId);
            
            if (onProgress) onProgress(i, result);
            
            if (result.completed) return result.data;
            if (result.failed) throw new Error(result.error);
        }
        throw new Error('Polling timeout');
    }

    async _checkStatus(promiseId) {
        const res = await fetch(`${this.serverUrl}/api/v1/requests/${promiseId}/result`);
        const data = await res.json();
        return {
            completed: data.data?.execute != null || data.data?.status === 'completed',
            failed: data.data?.status === 'failed',
            data: data.data,
            error: data.data?.error
        };
    }

    _sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
```

**Использование:**

```javascript
// stepRoutes.js
import { PollingDaemon } from '../daemon/polling-loop.js';

const daemon = new PollingDaemon({
    interval: 1000,
    maxPolls: 30,
    serverUrl: process.env.A2A_SERVER_URL || 'http://localhost:3000'
});

// В обработчике /next
if (a2aData.data?.promiseId) {
    const result = await daemon.pollPromise(
        a2aData.data.promiseId,
        (iteration, status) => {
            console.log(`[Daemon] Poll ${iteration}: ${status.completed ? 'done' : 'pending'}`);
        }
    );
    serverResponse = result;
}
```

**Приоритет:** High  
**Оценка:** 3 часа

---

### 3. Добавить мониторинг daemon

**Метрики:**
- Количество активных polling loops
- Средняя длительность polling
- Количество timeouts
- Количество ошибок

**Endpoint:** `GET /api/a2a/daemon/stats`

**Ответ:**

```json
{
    "activePolls": 2,
    "totalPolls": 150,
    "avgDuration": 3500,
    "timeouts": 5,
    "errors": 2,
    "uptime": 3600000
}
```

**Приоритет:** Medium  
**Оценка:** 2 часа

---

### 4. Улучшить обработку ошибок в daemon

**Текущие проблемы:**
- Тихие ошибки при network failures
- Нет retry логики для transient errors
- Нет graceful degradation

**Улучшения:**

```javascript
// polling-loop.js
async _checkStatus(promiseId) {
    try {
        const res = await fetch(`${this.serverUrl}/api/v1/requests/${promiseId}/result`, {
            timeout: 5000,
            retry: 3
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        return this._parseStatus(data);
    } catch (error) {
        console.error(`[Daemon] Poll error for ${promiseId}:`, error.message);
        
        // Transient errors - продолжаем polling
        if (this._isTransientError(error)) {
            return { completed: false, failed: false };
        }
        
        // Fatal errors - прерываем polling
        throw error;
    }
}

_isTransientError(error) {
    return error.name === 'AbortError' || 
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('timeout');
}
```

**Приоритет:** High  
**Оценка:** 2 часа

---

### 5. Документировать роли компонентов

**Файл:** `a2a-client/docs/architecture/COMPONENT_ROLES.md`

**Содержание:**

```markdown
# Component Roles

## Browser (Web UI)
- **Роль:** User interface, event handling
- **Долбит:** Client API (HTTP)
- **Не долбит:** A2A Server напрямую
- **Daemons:** DialogLoader (min display time), DialogPromise poll (→ Client API), optional UI ticks (taskbar)

## Client API (Vite Plugin)
- **Роль:** REST API, session management, storage
- **Долбит:** A2A Server (HTTP)
- **Не долбит:** AI Proxy напрямую

## Daemon (Polling Loop)
- **Роль:** Async operation tracking
- **Долбит:** A2A Server (/api/v1/requests/:id/result)
- **Интервал:** 1s
- **Timeout:** 30s

## A2A Server
- **Роль:** Business logic, orchestration
- **Долбит:** AI Hub (HTTP)
- **Не долбит:** Ollama напрямую
- **Daemons:** Request processor tick (queue), LLM-ready poll (dialog → AI Hub), recovery on startup

## AI integration (AI Hub)
- **Роль:** LLM adapter, promise lifecycle
- **Долбит:** Ollama (HTTP)
- **Daemons:** Async LLM job / promise completion worker (internal)
```

**Приоритет:** High  
**Оценка:** 1 час

---

### 6. Добавить диаграммы в DEV_STATE.md

**Обновить:** `a2a-client/DEV_STATE.md`

**Добавить секцию:**

```markdown
## Архитектура взаимодействия

### Polling Flow

```
Browser                Client API              Daemon                  A2A Server
   │                       │                      │                         │
   │──POST /next──────────>│                      │                         │
   │                       │──POST /invoke───────────────────────────────>│
   │                       │<─────promiseId───────────────────────────────│
   │                       │                      │                         │
   │                       │──start polling──────>│                         │
   │                       │                      │──GET /result──────────>│
   │                       │                      │<─────pending───────────│
   │                       │                      │                         │
   │                       │                      │──GET /result──────────>│
   │                       │                      │<─────pending───────────│
   │                       │                      │                         │
   │                       │                      │──GET /result──────────>│
   │                       │                      │<─────execute───────────│
   │                       │<─────result──────────│                         │
   │<──response────────────│                      │                         │
```

**Приоритет:** Medium  
**Оценка:** 1 час

---

## Приоритизация задач

| # | Задача | Приоритет | Оценка | Зависимости |
|---|--------|-----------|--------|--------------|
| 1 | Документация daemon (Client API) | High | 1h | - |
| 2 | Рефакторинг `PollingDaemon` (vite-plugin) | High | 3h | - |
| 3 | Обработка ошибок (client poll) | High | 2h | #2 |
| 4 | Документация ролей + daemons (все подсистемы) | High | 1h | - |
| 5 | Мониторинг daemon | Medium | 2h | #2 |
| 6 | Диаграммы в DEV_STATE | Medium | 1h | #4 |
| 7 | Выделить web daemons (`dialog-loader`, `dialog-promise-poll`) | Medium | 3h | - |
| 8 | Сервер: фасад `RequestProcessorDaemon` + опционально `llm-ready-poll` модуль | Medium | 2h | - |
| 9 | ai-integration: отделить promise/worker слой от HTTP views | Low | 4h | - |

**Итого (без #9):** ~15h · **с #9:** ~19h

---

## Критерии успеха

1. ✅ Каждая подсистема (web, client, server, ai-integration) имеет перечисленные daemons и границы ответственности
2. ✅ Client API polling к A2A Server вынесен в отдельный модуль (`PollingDaemon`)
3. ✅ Роли и «кто кого poll’ит» задокументированы
4. ✅ Обработка ошибок / retry на стороне client poll
5. ✅ Диаграммы потока (опционально multi-hop: web ↔ client ↔ server ↔ AI)

---

## Следующие шаги

1. Создать `vite-plugin-a2a/daemon/README.md` и реализовать `PollingDaemon`
2. Подключить в `stepRoutes.js` / `a2a-proxy.js`
3. Вынести web: `dialog-loader` + `dialog-promise-poll` из `session-store.js` (постепенно, без поломки API)
4. На сервере: при необходимости — тонкий фасад над `startRequestProcessor` / recovery
5. В ai-integration: один модуль «promise completion» отдельно от маршрутов Flask/FastAPI
6. Тесты на client daemon + обновить `COMPONENT_ROLES.md`

---

*Created: 2026-03-20 · Updated: 2026-03-21*
