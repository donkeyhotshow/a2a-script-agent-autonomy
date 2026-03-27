# DEV_STATE - a2a-client (2026-03-27)

Текущее состояние подсистемы a2a-client (Web UI + Client API).
> Методика: работаем по методике с дев файлами - пишем дев файл всегда, убираем ненужное всегда, двигаемся вперед всегда

---

## Архитектура

**Client API** - хранит сессии и управляет состоянием:
- Step-based storage (нумерованные папки)
- Vite plugin для `/api/a2a/*` endpoints

---

## Ports

| Порт | Компонент |
|------|-----------|
| 5173 | Vite Dev Server + Web UI |
| 3001 | Standalone Client API (опционально) |

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/a2a/projects` | Список проектов |
| POST | `/api/a2a/projects` | Создать проект |
| GET | `/api/a2a/sessions` | Список сессий |
| POST | `/api/a2a/sessions` | Создать сессию |
| GET | `/api/a2a/sessions/:id` | Получить сессию |
| POST | `/api/a2a/sessions/:id/next` | Отправить сообщение |
| GET | `/api/a2a/sessions/:id/async` | Polling async результата |
| GET | `/api/a2a/daemon/stats` | Статистика daemon |

---

## Session Storage

```
a2a-client/storage/sessions/{sessionId}/
├── 1/
│   ├── client-result.json      # Ввод пользователя
│   ├── request-to-server.json # Запрос к A2A Server
│   ├── server-response.json   # Ответ сервера
│   ├── server-promise.json    # Статус промиса
│   └── messages.json           # История сообщений
├── 2/
│   └── ...
└── ...
```

**Важно:** Нет root `session.json` - состояние определяется последним шагом.

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| **vite-plugin-a2a** | [vite-plugin-a2a.js](vite-plugin-a2a.js) | Main plugin |
| **stepRoutes** | [vite-plugin-a2a/routes/stepRoutes.js](vite-plugin-a2a/routes/stepRoutes.js) | Управление шагами |
| **sessionRoutes** | [vite-plugin-a2a/routes/sessionRoutes.js](vite-plugin-a2a/routes/sessionRoutes.js) | Управление сессиями |

---

## Context Fields (новые)

| Field | Type | Description |
|-------|------|-------------|
| `context.execution` | object | Текущее выполнение |
| `context.history` | array | История действий |
| `context.workbench` | object | Рабочее состояние |

---

## Тестирование

### Без запуска серверов

```bash
# Client API (mocked)
cd a2a-client && npm run test:client-api

# Full Vitest
cd a2a-client && npm test
```

### С запуском серверов

```bash
# 1. A2A Server (port 3000)
cd a2a-server && npm run dev:local

# 2. Vite (port 5173)
cd a2a-client && npx vite

# 3. Smoke tests
cd a2a-client && npm run smoke:client
```

### Manual curl

```bash
curl -s http://localhost:5173/api/a2a/projects
curl -s -X POST http://localhost:5173/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{"task":"Hello"}'
```

---

## Simulations

**Contract tests** - golden fixtures для sync потока:
- `client.json` → transforms → `response.json` → `received.json`
- [`simulations/SCHEMA.md`](simulations/SCHEMA.md)

**Verify:**
```bash
npm run sim:lint -- --all --json
npm run sim:validate -- --sim <name> --json
```

---

## Конфигурация

```bash
PORT=5173           # Vite port
WS_PORT=3002        # WebSocket
DEFAULT_SYNC_MODE=1
SKIP_AUTH=1
```

---

## Известные проблемы

### Promise Polling не завершается

**Файлы для проверки:**
- [vite-plugin-a2a/routes/stepRoutes.js](vite-plugin-a2a/routes/stepRoutes.js)

---

## Ссылки

- [docs/new-request-flow/PROTOCOL.md](docs/new-request-flow/PROTOCOL.md) - Протокол
- [AGENTS.md](AGENTS.md) - Правила работы
- [docs/LOADER-BEHAVIOR.md](docs/LOADER-BEHAVIOR.md) - Поведение лоадера

---

*Обновлено: 2026-03-27*