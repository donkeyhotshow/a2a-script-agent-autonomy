# DEV_STATE - Общее состояние проекта (2026-03-27)

> Общая информация о состоянии системы и кросс-компонентные проблемы
> **ОБНОВЛЕНО**: Переход на новый формат протокола (action-key shape, stateless server)

---

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ (Новый формат)

### 1. A2A Server - STATELESS (Убрано хранение сессий)

Сервер **больше НЕ хранит сессии** - только обрабатывает запросы:
- Удалён компонент `neurons` (устарел)
- Контекст сессии передаётся в каждом запросе
- Session storage перенесён в Client API

### 2. Keyword-Based Routing

Маршрутизация теперь **НЕ использует LLM** - использует статический keyword matching:
- Конфигурация: [`shared/router-static-choices.json`](shared/router-static-choices.json)
- Обработка: [`a2a-server/src/config/router-static.ts`](a2a-server/src/config/router-static.ts)
- Режимы: `dialog`, `agent`, `task-decomposition`, `fix-vue-imports`, `fix-laravel-namespaces-and-uses`

### 3. Action-Key Shape (ОБЯЗАТЕЛЬНО)

Все `execute` и `result` объекты ДОЛЖНЫ использовать action-key формат:

```json
// ✅ Правильно:
{ "execute": { "script": { "input": {...}, "code": "..." } } }
{ "result": { "read-file": { "path": "...", "content": "..." } } }

// ❌ Неправильно:
{ "execute": { "action": "read-file", "file": "..." } }
{ "result": { "content": "..." } }
```

### 4. Новые поля контекста

| Поле | Описание | Файл |
|------|----------|------|
| `context.execution` | Текущее состояние: { action, step, progress } | [types.js](a2a-client/packages/types/src/types.js) |
| `context.history` | История выполнения (массив записей) | [types.js](a2a-client/packages/types/src/types.js) |
| `context.workbench` | Рабочее состояние: sections, batch, slots | [types.js](a2a-client/packages/types/src/types.js) |

### 5. Новый формат хранения сессий

```
a2a-client/storage/sessions/{sessionId}/
├── 1/
│   ├── client-result.json      # Ввод пользователя
│   ├── request-to-server.json # Запрос к A2A Server
│   ├── server-response.json   # Ответ сервера (execute + context + result)
│   ├── server-promise.json    # Статус промиса (async)
│   └── messages.json          # История сообщений (слияние всех шагов)
├── 2/
│   └── ...
└── ...
```

**Важно**: Нет root `session.json` - состояние определяется последним заполненным шагом.

---

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web UI (5173)                           │
│   a2a-client/web - User interface with session management       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Client API / Vite Plugin                     │
│   a2a-client - Serves API, manages sessions, stores data        │
│   - Port: 3001 (или 5173 с Vite)                                │
│   - Stateless: НЕ обрабатывает запросы, только хранит сессии   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       A2A Server (3000)                         │
│   a2a-server - Processes requests (STATELESS)                 │
│   - /api/v1/invoke - Main invoke endpoint                      │
│   - No session storage - stateless processing                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI Hub Proxy (11434)                        │
│   ai-integration - Routes to LLM providers                     │
│   - Встроенный daemon для async promise обработки              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ollama (11435)                             │
│   Local LLM service (qwen3:8b, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Подсистемы

| Подсистема | Описание | Файл состояния |
|------------|----------|----------------|
| **a2a-client** | Web UI, Client API, Session Management | [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md) |
| **a2a-server** | Request Processing (STATELESS), Router, Transform | [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md) |
| **ai-integration** | AI Proxy, Ollama, Promises, Daemon | [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md) |
| **docs** | Project documentation (НОВЫЙ ФОРМАТ) | [`docs/DEV_STATE.md`](docs/DEV_STATE.md) |
| **scripts** | Development and testing scripts | [`scripts/DEV_STATE.md`](scripts/DEV_STATE.md) |
| **simulations** | Test simulations and scenarios | [`simulations/DEV_STATE.md`](simulations/DEV_STATE.md) |

---

## Ключевые компоненты (Новый формат)

### a2a-server

| Компонент | Назначение | Файл |
|-----------|------------|------|
| **invoke.service** | Точка входа - обработка запросов | [invoke.service.ts](a2a-server/src/services/utils/invoke.service.ts) |
| **router-static** | Keyword-based routing | [router-static.ts](a2a-server/src/config/router-static.ts) |
| **Request Processors** | Обработка разных типов запросов | [request-processor/](a2a-server/src/services/core/request-processor/) |
| - dialog-request-processor | LLM диалог | |
| - action-request-processor | Agent действия | |
| - form-request-processor | Формы и выборы | |
| - simulation-request-processor | Симуляции | |
| **Transform Pipeline** | Трансформация запросов/ответов | [transform/](a2a-server/src/transform/) |

### a2a-client

| Компонент | Назначение | Файл |
|-----------|------------|------|
| **vite-plugin-a2a** | Main API handler | [vite-plugin-a2a.js](a2a-client/vite-plugin-a2a.js) |
| **stepRoutes** | Управление шагами сессий | [stepRoutes.js](a2a-client/vite-plugin-a2a/routes/stepRoutes.js) |
| **Session Types** | Модель данных | [types.js](a2a-client/packages/types/src/types.js) |

---

## Выполненные задачи (Новый формат)

### Переход на новый протокол (2026-03-27)

- [x] **STATELESS Server** - A2A Server не хранит сессии
- [x] **Keyword-based routing** - статическая маршрутизация вместо LLM
- [x] **Action-key shape** - обязательный формат execute/result
- [x] **Context fields** - execution, history, workbench
- [x] **Step storage** - нумерованные папки (1/, 2/, ...)
- [x] **Sync/Async modes** - DEFAULT_SYNC_MODE=1 для тестирования
- [x] **Router form** - выбор режима через choices

### Убранные компоненты

| Компонент | Причина | Альтернатива |
|-----------|---------|--------------|
| Neurons | Устарел | action-request-processor |
| LLM Router Transform | Заменён | keyword-based routing |
| Server-side session storage | Перенесён | Client API storage |
| **scripts/prod-test.js** | Удалён | direct-tests/run-checks.ps1 |
| **scripts/dev-launch.js** | Удалён | Ручной запуск сервисов |
| **scripts/orchestrator.js** | Удалён | - |
| **scripts/generate-*** | Удалён | - |
| **scripts/inspect-dist-transform.ts** | Удалён | - |

---

## Технические детали

| Параметр | Значение |
|----------|----------|
| A2A Server | http://localhost:3000 |
| Client API | http://localhost:5173/api/a2a (Vite) |
| Web UI | http://localhost:5173 |
| AI Hub Proxy | http://localhost:11434 |
| Ollama | http://localhost:11435 |
| Модель | qwen3:8b |

### Переменные окружения

| Переменная | Описание | Значение |
|------------|----------|----------|
| `SKIP_AUTH` | Пропустить авторизацию | 1 |
| `ENCRYPTION_KEY` | Ключ шифрования (32 символа) | 12345678901234567890123456789012 |
| `JWT_SECRET` | Секрет JWT (мин. 32 символа) | 12345678901234567890123456789012 |
| `DEFAULT_SYNC_MODE` | Синхронный режим | 1 |

---

## Документация

### Основная (Новый формат)

| Документ | Описание |
|----------|----------|
| [docs/new-request-flow/PROTOCOL.md](docs/new-request-flow/PROTOCOL.md) | Протокол (action-key shape) |
| [docs/new-request-flow/ARCHITECTURE.md](docs/new-request-flow/ARCHITECTURE.md) | Архитектура |
| [docs/new-request-flow/SESSION-FLOW.md](docs/new-request-flow/SESSION-FLOW.md) | Поток сессий |
| [docs/new-request-flow/SCHEMAS.md](docs/new-request-flow/SCHEMAS.md) | JSON схемы |

### Для разработки

| Документ | Описание |
|----------|----------|
| [AGENTS.md](AGENTS.md) | Правила работы с агентами и протокол A2A |
| [GLOSSARY.md](GLOSSARY.md) | Терминология проекта |
| [README.md](README.md) | Основная документация |

---

## Актуальные проблемы (Кросс-компонентные)

### 1. Promise Polling не завершается

**Симптомы:**
- Promise остается в статусе "pending" в `server-promise.json`
- A2A Server уже вернул результат, но Client API не видит завершения

**Анализ:**
- Проверено через curl: A2A Server возвращает результат для promise
- Результат содержит `execute` с формой выбора (3 choices)
- Client API (stepRoutes.js) должен был опросить promise и сохранить результат

**Файлы для проверки:**
- [`a2a-client/vite-plugin-a2a/routes/stepRoutes.js`](a2a-client/vite-plugin-a2a/routes/stepRoutes.js) - логика polling и сохранения

---

## Ссылки

- [Спецификация протокола](docs/new-request-flow/PROTOCOL.md)
- [Архитектура системы](docs/new-request-flow/ARCHITECTURE.md)
- [AGENTS.md](AGENTS.md) - Правила работы

---

*Обновлено: 2026-03-27*
