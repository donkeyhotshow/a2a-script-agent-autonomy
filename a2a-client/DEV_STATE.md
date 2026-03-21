# DEV_STATE - a2a-client

> Клиентская часть: Web UI, Client API, Session Management

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

### Daemon Components

| Component | Location | Role |
|-----------|----------|------|
| DialogLoader | web/js/daemons/dialog-loader.js | Min 5s loader display |
| DialogPromise | web/js/daemons/dialog-promise-poll.js | Browser → Client API poll |
| PollingDaemon | vite-plugin-a2a/daemon/a2a-result-poll.js | Client API → A2A Server poll |
| RequestProcessor | a2a-server/src/... | Queue processing, recovery |

### Ports

| Service | Port | Protocol |
|---------|------|----------|
| Web UI | 5173 | HTTP |
| Client API | 5173/api/a2a | HTTP |
| A2A Server | 3000 | HTTP |
| AI Hub | 11435 | HTTP |
| Ollama | 11434 | HTTP |

---

**Реализовано согласно:** [`ARCHITECTURE_UPGRADE_PLAN.md`](./ARCHITECTURE_UPGRADE_PLAN.md)

---

## Подсистемы проекта

| Подсистема | Описание |
|------------|----------|
| **a2a-client** | Web UI, Client API, Session Management (этот файл) |
| **a2a-server** | [DEV_STATE.md](../a2a-server/DEV_STATE.md) |
| **ai-integration** | [DEV_STATE.md](../ai-integration/DEV_STATE.md) |

---

## Клиентские проблемы

### 1. UI/Browser

#### Баг: Глобальный processing (2026-03-20)

**Проблема:** Глобальный loader показывался для всех сессий, когда любая сессия ожидала ответ

**Причина:** Один глобальный элемент с ID `global-task-loader` для всех сессий

**Исправление:** Переделано на per-session:
- task-flow/core.js: session-specific ID `session-loader-{sessionId}`
- task-flow/render.js: session-specific ID элемента
- window-events.js: `_showGlobalLoader(sessionId)` и `_hideGlobalLoader(sessionId)`

#### Баг: Choices не отображались (2026-03-20)

**Проблема:** После отправки "диалог" вместо формы выбора показывалось снова поле ввода

**Корневая причина:** stepRoutes.js искал `serverResponse?.result?.execute`, но A2A Server возвращает `execute` на верхнем уровне

**Исправление:** 
- stepRoutes.js строка 319: `serverResponse?.execute || serverResponse?.result?.execute`
- stepRoutes.js строки 354-359: правильный путь к execute

#### Баг: Дублирование приветствия (2026-03-20)

**Проблема:** Сообщение "What would you like me to do?" показывалось 2 раза

**Корневая причина:** sessionRoutes.js добавлял сообщение из execute.message, потом из stepData.messages

**Исправление:** Добавлена дедупликация с использованием Set

#### Баг: Loader поведение (2026-03-20)

**Проблема:** Loader показывался некорректно - не было минимального времени показа

**Исправления:**
- Loader показывается **сразу** при отправке пользователем
- **Минимальное время показа**: 5000ms (всегда enforce)
- Loader скрывается **только после resolved promise**
- При перезагрузке страницы: loader показывается для сессий со статусом `pending`

---

### 2. Session Management

#### Баг: Восстановление сессии после перезагрузки (2026-03-20)

**Проблема:** После перезапуска страницы сессию нельзя было продолжить

**Причина:** API не возвращал promiseId при загрузке сессии

**Исправление:** sessionRoutes.js - при загрузке сессии проверяется server-promise.json и возвращаются поля promiseId и promiseStatus

#### Баг: Пустые messages при создании сессии (2026-03-20)

**Проблема:** messages.json шаг 1 содержал пустой массив `[]`

**Корневая причина:** sessionRoutes.js:77 передавал пустой массив `messages: []` вместо `session.messages`

**Исправление:** Заменено `messages: []` на `messages: session.messages || []`

#### Баг: Определение шага в /promise/ endpoint (2026-03-20)

**Проблема:** endpoint использовал устаревший `session.currentStep`

**Исправление:** Добавлен поиск шага, где был создан promise:
```javascript
const allSteps = listNewSteps(cwd, sessionId);
let promiseStepNum = null;
for (const stepNum of allSteps) {
    const promiseData = loadServerPromise(cwd, sessionId, stepNum);
    if (promiseData?.promiseId === promiseId) {
        promiseStepNum = stepNum;
        break;
    }
}
```

---

### 3. API Integration

#### Баг: Promise polling не завершался

**Проблема:** A2A Server возвращает результат promise БЕЗ поля `status`

**Исправление:** Теперь проверяется и наличие поля `execute`:
```javascript
const isCompleted = pollData.data?.status === 'completed' || 
                   pollData.data?.status === 'done' ||
                   pollData.data?.execute != null;
```

#### Баг: Извлечение assistant message

**Проблема:** В `/promise/` endpoint искали message в `promiseStatus?.result?.message`, но A2A Server возвращает его в `execute.message`

**Исправление:** Добавлен правильный порядок извлечения:
```javascript
const assistantMessage = promiseStatus?.execute?.message || 
                        promiseStatus?.result?.message ||
                        promiseStatus?.message || null;
```

---

## Тихие ошибки и дефолтные состояния (2026-03-20)

### Исправления обработки ошибок:

| # | Файл | Проблема | Исправление |
|---|------|----------|-------------|
| 1 | stepRoutes.js:370 | A2A server unavailable | Возврат `success: false` + HTTP 503 |
| 2 | session-store.js:53,217 | EventEmitter ошибки | Пробрасываются через `emit('error')` |
| 3 | session-store.js:438 | Дефолт `{}` | Заменен на `null` с предупреждением |
| 4 | stepRoutes.js:228,438 | JSON.parse | Добавлена проверка пустого ответа |
| 5 | task-flow/api.js:56 | Тихий catch | Логирование + throw |
| 6 | task-flow/render.js:36,44 | Множественный fallback | Добавлено логирование |
| 7 | api-integration.js:119,150 | Ошибки API | `console.warn` для видимости |

---

## Архитектура

### Иерархия классов:

```
EventEmitter (abstract)
└── SessionStoreCore extends EventEmitter
    └── SessionStore extends SessionStoreCore
```

### Компоненты:

| Компонент | Файл | Описание |
|-----------|------|----------|
| EventEmitter | `web/js/core/EventEmitter.js` | Базовый класс событий |
| DialogState | `web/js/core/DialogState.js` | Управление состоянием диалога |
| DialogLoader | `web/js/core/DialogLoader.js` | Управление загрузкой |
| DialogPromise | `web/js/core/DialogPromise.js` | Управление промисами |
| SessionStore | `web/js/session-store.js` | Хранение сессий |
| TaskFlow | `web/js/task-flow/core.js` | Основной поток задач |

### API Endpoints (Client API):

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/api/a2a/projects` | Список проектов |
| GET | `/api/a2a/sessions` | Список сессий |
| POST | `/api/a2a/sessions` | Создать сессию |
| GET | `/api/a2a/sessions/{id}` | Получить сессию |
| POST | `/api/a2a/sessions/{id}/next` | Отправить сообщение |
| POST | `/api/a2a/sessions/{id}/steps` | Сохранить шаг |
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Статус промиса |

---

## Конфигурация

| Параметр | Значение |
|----------|----------|
| Порт | 5173 |
| Storage | `a2a-client/storage/sessions/` |
| Session Format | Пронумерованные папки (1/, 2/, 3/) |

---

*Обновлено: 2026-03-20*
