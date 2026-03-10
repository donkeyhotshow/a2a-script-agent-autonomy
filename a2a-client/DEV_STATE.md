# DEV_STATE - a2a-client (2026-03-07)

## Web UI (Порт 5173)

### Результаты тестирования Web UI

```bash
# Проверка через CLI
cd a2a-client/tester
node cli.js status
node cli.js send get_status
```

| Тест | Компоненты | Статус | CLI Команда | Детали |
|------|------------|--------|-------------|--------|
| Web UI | localhost:5173 | ✅ Работает | - | Vite dev server запущен |
| Web UI доступность | HTTP 200 | ✅ Работает | `node cli.js status` | CLI проверка доступности |
| Прокси API | localhost:5173 → 3001 | ✅ Настроен | `node cli.js monitor` | Vite проксирует /api к client-api |
| Web Client команды | CLI → Web UI | ✅ Работает | `node cli.js send ping` | CLI управление через SSE |

### Проверка E2E пути через CLI

| Этап | Компонент | Порт | Статус | CLI Проверка |
|------|-----------|------|--------|--------------|
| 1 | Web UI (браузер) | 5173 | ✅ Работает | - |
| 2 | Vite прокси | 5173 → 3001 | ✅ Настроен | `node cli.js monitor --filter connected` |
| 3 | Client API | 3001 | ✅ Работает | `node cli.js status` |
| 4 | CLI управление | CLI → Web UI | ✅ Работает | `node cli.js panel show task-panel` |

---

## CLI Команда start-promise-daemon

Добавлена новая CLI команда для ручного запуска демона обработки промисов.

### Использование

```bash
# Запуск демона с параметрами по умолчанию
npm run cli start-promise-daemon

# Запуск с пользовательскими параметрами
npm run cli start-promise-daemon --interval 5 --log-level DEBUG

# Режим dry-run (только логирование, без выполнения)
npm run cli start-promise-daemon --dry-run --log-level INFO

# Указать прокси URL
npm run cli start-promise-daemon --proxy-url http://localhost:11435
```

### Доступные параметры

| Параметр | Описание | По умолчанию |
|----------|---------|-------------|
| `--proxy-url` | URL прокси ai-integration | `http://localhost:11435` |
| `--interval` | Интервал опроса в секундах | `4.0` |
| `--timeout` | HTTP таймаут для вызовов прокси | `15.0` |
| `--log-level` | Уровень логирования (DEBUG, INFO, WARNING, ERROR) | `INFO` |
| `--dry-run` | Не выполнять /promise/<id>/execute, только логировать | `false` |
| `--no-auto-approve` | Не вызывать автоматически /promise/<id>/execute | `false` |
| `--max-empty-cycles` | Остановить после N пустых циклов (0 = бесконечно) | `0` |
| `--response-attempts` | Количество попыток получить ответ промиса | `5` |
| `--response-delay` | Задержка между попытками получения ответа | `0.6` |

### Примеры использования

```bash
# Запуск демона в фоновом режиме с логами
npm run cli start-promise-daemon --log-level DEBUG

# Тестовый запуск (dry-run)
npm run cli start-promise-daemon --dry-run

# Быстрый запуск с коротким интервалом
npm run cli start-promise-daemon --interval 2 --log-level INFO
```

---

## Client API

### Проверка статуса через CLI

| Сервис | Порт | Статус | CLI Команда | Детали |
|--------|------|--------|-------------|--------|
| client-api (HTTP) | 3001 | ✅ Работает | `node cli.js status` | CLI проверка здоровья API |
| client-api (WS) | 3002 | ⚠️ Конфликт | - | WebSocket порт конфликтует |
| tester-api (HTTP) | 3001 | ✅ Работает | `node cli.js status` | CLI API для управления |
| CLI → Web Client | SSE | ✅ Работает | `node cli.js send ping` | Команды через SSE |

### Автоматизированные проверки через CLI

```bash
# Быстрая проверка здоровья всей системы
cd a2a-client/tester
npm run health
# Результат: Полный отчет о состоянии компонентов

# Индивидуальные проверки
node cli.js status                    # Статус API сервера
node cli.js send ping                 # Проверка команд
node cli.js monitor --filter tester_command &  # Мониторинг SSE
node cli.js panel show task-panel     # Управление панелями

# Автоматизированное тестирование
npm run test:all                      # Все тест-сьюты
npm run test:panels                   # Панельное тестирование
npm run test:sessions                 # Сессионное тестирование
npm run test:commands                 # Тестирование команд
npm run test:performance              # Тестирование производительности
```

**Health Check отчет включает:**
- ✅ API Server доступность
- ✅ CLI-Web Client коммуникация
- ✅ Панельное управление
- ✅ Сессионное управление
- ✅ SSE соединения
- 📊 Детальные метрики и тайминги

### Известные проблемы

- Запросы остаются в статусе "pending", так как асинхронный обработчик (promise-daemon) не запущен
- Для полноценной обработки запросов необходимо запустить `promise-daemon` или аналогичный процессор
- Асинхронные задачи не доходят до Web UI: после получения `promiseId` клиент больше не делает GET `/api/v1/requests/:promiseId/status` или `/result`, и поэтому SSE/WebSocket никогда не получает финальный `execute`. По факту web-клиент застревает в ожидании без данных — reproducible через POST `/api/v1/requests` с требованием LLM (в логах видно только исходный POST, без дальнейших обращений по promiseId). Требуется вернуть polling/деливери результатов на клиенте.

---

## Исправленные баги (2026-03-07)

### Обзор исправлений

Исправлено 6 критических багов в кодовой базе:

| Bug ID | Компонент | Проблема | Решение |
|--------|-----------|----------|---------|
| **Bug 12** | `task-flow/core.js` | Попытка присвоения к getter-only свойствам `store.sessionId`/`store.projectId` | Замена на `store.setSession(sessionId, projectId)` |
| **Bug 13** | `task-flow/core.js` | Race condition в `sendChoice`/`sendMessageResult` | Перемещение `waitForFirstResponse()` перед `handler.submit()` |
| **Bug 14** | `packages/sdk/src/server/index.ts` | PATCH `/sessions` позволяет перезаписывать критические поля | Добавлен whitelist разрешенных полей обновления |
| **Bug 15** | `web/js/app/window-manager.js` | Singleton SessionStore делится между окнами сессий | Создание per-window SessionStore экземпляров |
| **Bug 16** | `web/js/session-store.js` | `reset()` пропускает `promisePending: false` | Добавлено `promisePending: false` в reset state |
| **Bug 17** | `packages/sdk/src/server/index.ts` | WebSocket handlers всегда используют `projects[0]` | Замена на `findSessionInAllProjects(sessionId)` |

### Детали исправлений

#### Bug 12: Getter-only свойства SessionStore
**Проблема:** В `task-flow/core.js` метод `_doRun` пытался присвоить значения свойствам `store.sessionId` и `store.projectId`, которые определены как getters без setters.

**Решение:** Заменил прямое присвоение на вызов метода `store.setSession(sessionId, projectId)`.

#### Bug 13: Race condition в обработке ответов
**Проблема:** `handler.submit()` выполнялся до подписки на события в `waitForFirstResponse()`, что приводило к потере события `execute`.

**Решение:** Переместил создание промиса `waitForFirstResponse()` перед вызовом `handler.submit()`.

#### Bug 14: Уязвимость PATCH endpoint
**Проблема:** PATCH `/sessions/:sessionId` позволял клиентам перезаписывать критические поля (`id`, `projectId`, `createdAt`).

**Решение:** Добавлен whitelist разрешенных полей: `title`, `task`, `status`, `selectedAction`, `lastPromiseId`, `messages`, `version`, `execution`.

#### Bug 15: Конфликт SessionStore между окнами
**Проблема:** Все окна сессий использовали один глобальный `SessionStore`, что приводило к перезаписи данных между окнами.

**Решение:** Изменен `SessionStore` с object literal на constructor function, созданы per-window экземпляры.

#### Bug 16: Неполное состояние reset
**Проблема:** Метод `reset()` не включал `promisePending: false` в новое состояние.

**Решение:** Добавлено `promisePending: false` в объект состояния reset.

#### Bug 17: Неправильный поиск проекта в WebSocket
**Проблема:** WebSocket handlers `handleChoiceSelection` и `handleActionResult` всегда использовали `projects[0]`.

**Решение:** Заменено на `findSessionInAllProjects(sessionId)` для поиска правильного проекта.

### Архитектурные изменения

- **SessionStore**: Переход от singleton к multi-instance архитектуре
- **Window Manager**: Поддержка per-window SessionStore экземпляров
- **Server Security**: Field whitelisting для PATCH операций
- **WebSocket**: Правильное разрешение проектов для сессий

---

## Возможные будущие проблемы

### 1. Проблемы с сессиями

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Устаревшие данные сессии** | При длительном простое данные сессии могут утратить актуальность (запросы устаревают, история не синхронизируется) | Реализовать TTL для данных сессии, периодическую синхронизацию с сервером |
| **Конфликты данных** | При параллельных запросах из нескольких вкладок возможны конфликты данных (дублирование, перезапись) | Использовать optimistic locking, версионирование сессий |
| **Потеря сессии на рефреше** | Сессия эфемерна, теряется при обновлении страницы | Реализовать session restore API, reconnect на загрузке |

### 2. Проблемы с SSE/WebSocket

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Разрыв соединения** | Нестабильное соединение приводит к разрыву SSE/WebSocket | Реализовать auto-reconnect с экспоненциальной задержкой, heartbeat/ping-pong |
| **Переподключение** | При переподключении возможна потеря событий, произошедших во время разрыва | Queue буфер для событий, replay механизм |
| **Дублирование событий** | Проблемы сети могут вызвать дублирование событий | Idempotency keys, дедупликация на клиенте |
| **SSL/TLS проблемы** | Ошибки SSL на production | Проверка сертификатов, fallback на HTTP для разработки |

### 3. Проблемы с производительностью

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Большие диалоги** | При длительном использовании накапливается много сообщений, замедление UI | Виртуализация списка сообщений, пагинация истории |
| **Утечки памяти** | Неправильная очистка обработчиков событий, ссылок на DOM | Регулярный аудит памяти, WeakMap/WeakSet для кэшей |
| **Блокировка UI** | Синхронные операции блокируют интерфейс | Web Workers для тяжёлых операций, async/await |
| **Большие payload** | SSE сообщения могут содержать большие данные | Чанкинг, сжатие (gzip), бинарный формат |

### 4. Проблемы с синхронизацией

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Гонки (Race Conditions)** | Параллельные запросы создают состояние гонки | Mutex/ семафоры, очередь запросов |
| **Потерянные события** | События могут потеряться при разрыве соединения | Sequence IDs, подтверждение получения |
| **Рассинхронизация состояния** | Локальное состояние не соответствует серверному | Periodic reconciliation, state hashing |

### 5. Проблемы с совместимостью браузеров

| Проблема | Описание | Решение |
|----------|----------|--------|
| **SSE поддержка** | Не все браузеры полностью поддерживают SSE | Polyfill, fallback на polling |
| **WebSocket версии** | Разные версии WS протокола | Feature detection, fallback |
| **CORS ограничения** | Ограничения на кросс-доменные запросы | Проксирование, CORS заголовки |
| **Private/Incognito режим** | Ограничения browser storage | Серверное хранилище, полная функциональность |

### 6. Проблемы с аутентификацией и токенами

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Истечение токена** | JWT/сессионные токены истекают | Auto-refresh token механизм, graceful re-auth |
| **Невалидный токен** | Токен может стать невалидным (logout, revoke) | Валидация перед каждым запросом, handling 401 |
| **Token theft** | Токен может быть украден (XSS) | Short-lived токены, httpOnly cookies |
| **Multiple tabs auth** | Сессия в одной вкладке может отличаться от другой | BroadcastChannel для синхронизации auth state |

### Рекомендации по мониторингу

1. **Логирование** - Внедрить централизованное логирование с уровнями (ERROR, WARN, INFO, DEBUG)
2. **Метрики** - Отслеживать время отклика, количество ошибок, активных соединений
3. **Alerting** - Настроить уведомления при аномалиях (высокий % ошибок, длительные разрывы)
4. **Health checks** - Периодические проверки состояния соединений и сервисов

---

## Тестирование

### Уровень 1: AI Integration (включён)

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `test-ai-integration.ps1` | Тестирование прокси и демона | ✅ Включён |

### Уровень 2: A2A Server (включён)

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `test-a2a-server.ps1` | Тестирование API и нейронов | ✅ Включён |

### Уровень 3: A2A Client

**Требование:** Тестирующий скрипт должен быть на этом уровне + два предыдущих уровня.

| Скрипт | Назначение | Статус | CLI Альтернатива |
|--------|------------|--------|------------------|
| `test-a2a-client.ps1` | Тестирование Client API и WebSocket | 📝 Требуется | ✅ CLI доступен |
| `a2a-client/tester/` | CLI тестирование и управление | ✅ Работает | - |

### Что проверяет CLI

```bash
# 1. Client API HTTP доступность
node cli.js status
# ✓ Проверка здоровья API сервера

# 2. CLI-Web Client коммуникация через SSE
node cli.js send ping
# ✓ Проверка отправки команд на веб-клиент

# 3. Панельное управление
node cli.js panel show task-panel
# ✓ Проверка управления UI компонентами

# 4. Сессионное управление
node cli.js session create --title "Test Session"
# ✓ Проверка создания и управления сессиями

# 5. Мониторинг в реальном времени
node cli.js monitor --filter tester_command
# ✓ Проверка SSE соединений и событий

# 6. Автоматизированное тестирование
node cli.js test --interactive
# ✓ Запуск полного набора тестов
```

**CLI проверяет:**
- Client API HTTP доступен на порту 3001 ✓
- CLI API для управления работает на порту 3001 ✓
- Команды передаются на веб-клиент через SSE ✓
- Панели и сессии управляются удаленно ✓
- События мониторятся в реальном времени ✓
- Автоматизированные тесты выполняются ✓

---

## Web UI Component

**Port**: 5173

**Status**: Active development with unified architecture (SessionStore, TransportManager, PanelManager).

**Documentation**: Web UI component status, architecture, and implementation notes are covered in the docs/README.md section.

---

## Sync/Async Response Handling (2026-03-06)

### Проблема
Сервер (порт 3000) **всегда** возвращал `promiseId` для асинхронной обработки, даже для простых задач без LLM. Web UI ждал `execute` в ответе, но получал только `promiseId` и падал в ожидание SSE.

### Решение
Сервер теперь поддерживает **синхронные ответы** для простых задач:

| Тип задачи | Обработка | Ответ |
|------------|-----------|-------|
| Начальный `task` | Sync | `{ sync: true, execute: { form: {...} } }` |
| `choice` selection | Sync | `{ sync: true, execute: { message: ... } }` |
| LLM требуется | Async | `{ promiseId, status: 'pending' }` |

### Изменения

**Server (порт 3000)**
- `invoke.service.ts` - `isSynchronousTask()` определяет sync/async
- `form-request-processor.ts` - обрабатывает `result.choice` (action-key shape)
- `index.ts` - возвращает `{ sync, execute }` или `{ promiseId }`

**Client API (порт 3001)**
- `server/index.ts` - POST `/sessions` и `/result` обрабатывают sync-ответы
- Broadcast в Web UI через SSE с `execute`

**Web UI (порт 5173)**
- `task-flow.js` - `sendChoice()` и `sendMessage()` ждут sync-ответ или SSE
- Показывает выбор пользователя перед отправкой

### Flow

```
Пользователь отправляет task
  ↓
POST /sessions → Client API → Server /invoke
  ↓
Сервер: isSynchronousTask(task)?
  ├─ ДА → processSync() → { sync: true, execute: { form: {...} } }
  └─ НЕТ → create promiseId → async queue
  ↓
Client API: если sync → broadcast SSE
  ↓
Web UI: renderExecute(execute) - форма появляется сразу
```

---

## Session Persistence (Восстановление после перезагрузки)

### Реализация

**`session-store.js`**
- Нет автосохранения в браузер - состояние эфемерно
- Данные сессии на сервере (через `/api/storage`)
- `restoreAndReconnect(sessionId)` - восстановление с сервера и переподключение к SSE
- `clearStorage()` - no-op (нет локального хранилища)

**`task-flow.js`**
- `restorePanel(state)` - восстановление UI панели из сохраненного состояния
- Слушает событие `restore` от SessionStore

**`index.html`**
- При `DOMContentLoaded` вызывает `SessionStore.restoreAndReconnect()`
- Если есть сохраненная сессия с `execute` → открывает панель и рендерит состояние

### Flow восстановления

```
Перезагрузка страницы
  ↓
DOMContentLoaded
  ↓
Получаем sessionId из URL или API
  ↓
restoreAndReconnect(sessionId) → TransportManager.connect(sessionId)
  ↓
Загружаем состояние с сервера → TaskFlow.restorePanel(state)
  ↓
Панель открыта, форма/сообщение видны, SSE подключен
```
