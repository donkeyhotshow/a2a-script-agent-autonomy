# DEV_STATE - A2A Client (2026-03-27)

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### Переход на STATELESS + Новый формат

**Изменения:**
- ✅ Хранение сессий перенесено в Client API (step storage)
- ✅ Контекст передаётся в каждом запросе
- ✅ Новые поля контекста: execution, history, workbench
- ✅ Action-key shape для execute/result
- ✅ Step-based storage (нумерованные папки)

---

## Архитектура

### Подсистемы проекта

Подсистемы проекта описаны в общем [`DEV_STATE.md`](../DEV_STATE.md).

### Daemons

- **Web**: DialogLoader (min 5s), DialogPromise poll → Client API
- **Client API**: PollingDaemon → A2A Server
- **A2A Server**: Request processor tick (STATELESS)
- **AI Integration**: Promise completion worker

### Общая архитектура системы
Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

### Polling Flow

```
Browser → Client API → A2A Server → AI Hub → Ollama
              ↑
         PollingDaemon
```

---

## Компоненты

### Vite Plugin (Client API)

| Компонент | Файл | Назначение |
|-----------|------|------------|
| **vite-plugin-a2a** | [vite-plugin-a2a.js](../vite-plugin-a2a.js) | Главный plugin |
| **projectRoutes** | [routes/projects.js](vite-plugin-a2a/routes/projects.js) | Управление проектами |
| **sessionRoutes** | [routes/sessionRoutes.js](vite-plugin-a2a/routes/sessionRoutes.js) | Управление сессиями |
| **stepRoutes** | [routes/stepRoutes.js](vite-plugin-a2a/routes/stepRoutes.js) | Управление шагами |
| **kvRoutes** | [routes/kvRoutes.js](vite-plugin-a2a/routes/kvRoutes.js) | KV хранилище |
| **daemonRoutes** | [routes/daemonRoutes.js](vite-plugin-a2a/routes/daemonRoutes.js) | Daemon monitoring |

### Session Storage (НОВОЕ)

```
a2a-client/storage/sessions/{sessionId}/
├── 1/
│   ├── client-result.json      # Ввод пользователя
│   ├── request-to-server.json # Запрос к A2A Server
│   ├── server-response.json   # Ответ сервера
│   ├── server-promise.json     # Статус промиса
│   └── messages.json           # История сообщений
├── 2/
│   └── ...
└── ...
```

**Важно**: Нет root `session.json` - состояние определяется последним заполненным шагом.

### Session Types

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID сессии |
| `status` | string | Статус (PENDING, READY, IN_PROGRESS, COMPLETED, ERROR) |
| `context` | object | Контекст с новыми полями |
| `messages` | array | История сообщений |
| `execution` | object | Текущее выполнение (NEW) |
| `history` | array | История действий (NEW) |
| `workbench` | object | Рабочее состояние (NEW) |

---

## API Endpoints (Client API)

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/api/a2a/projects` | Список проектов |
| POST | `/api/a2a/projects` | Создать проект |
| GET | `/api/a2a/sessions` | Список сессий |
| POST | `/api/a2a/sessions` | Создать сессию |
| GET | `/api/a2a/sessions/:id` | Получить сессию |
| PUT | `/api/a2a/sessions/:id` | Обновить сессию |
| POST | `/api/a2a/sessions/:id/next` | Отправить следующее сообщение |
| GET | `/api/a2a/sessions/:id/async` | Polling async результата |
| GET | `/api/a2a/sessions/:id/promise/:promiseId` | Polling promise (legacy) |
| GET | `/api/a2a/daemon/stats` | Статистика daemon |

---

## Документация

### Основная
- [docs/new-request-flow/PROTOCOL.md](../docs/new-request-flow/PROTOCOL.md) - Протокол
- [docs/new-request-flow/ARCHITECTURE.md](../docs/new-request-flow/ARCHITECTURE.md) - Архитектура
- [docs/new-request-flow/SESSION-FLOW.md](../docs/new-request-flow/SESSION-FLOW.md) - Поток сессий

### ADR (Architecture Decision Records)
- [docs/adr/README.md](../docs/adr/README.md) - Индекс ADR

### API
- [docs/CLIENT_API_WEB_SDK.md](../docs/CLIENT_API_WEB_SDK.md) - Web SDK
- [docs/SESSION-STORAGE.md](../docs/SESSION-STORAGE.md) - Хранение сессий

### Поведение
- [docs/LOADER-BEHAVIOR.md](../docs/LOADER-BEHAVIOR.md) - Поведение лоадера
- [docs/DIALOG-FRONTEND.md](../docs/DIALOG-FRONTEND.md) - Диалоговый фронтенд

---

## Мониторинг

### Daemon Stats
- `GET /api/a2a/daemon/stats` - Статистика PollingDaemon

---

## Известные проблемы

### 1. Promise Polling не завершается

**Симптомы:**
- Promise остается в статусе "pending" в `server-promise.json`
- A2A Server уже вернул результат, но Client API не видит завершения

**Файлы для проверки:**
- [vite-plugin-a2a/routes/stepRoutes.js](vite-plugin-a2a/routes/stepRoutes.js) - логика polling

---

## Тестирование

```bash
# Тест 1: Проверка Client API
curl -s http://localhost:5173/api/a2a/projects

# Тест 2: Создание сессии
curl -s -X POST http://localhost:5173/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Session","task":"Hello"}'

# Тест 3: Отправка сообщения
curl -s -X POST http://localhost:5173/api/a2a/sessions/:id/next \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет"}'
```

---

## Конфигурация

| Переменная | Описание | Значение |
|------------|----------|----------|
| PORT | Порт Vite | 3001 (или 5173) |
| WS_PORT | WebSocket порт | 3002 |
| DEFAULT_SYNC_MODE | Синхронный режим | 1 |
| SKIP_AUTH | Пропустить авторизацию | 1 |

---

## Что было убрано

| Компонент | Причина |
|-----------|---------|
| Root session.json | Заменён step-based storage |
| Server-side sessions | A2A Server теперь stateless |

---

## Ссылки

- [Спецификация протокола](../docs/new-request-flow/PROTOCOL.md)
- [AGENTS.md](../AGENTS.md)

---

Обновлено: 2026-03-27