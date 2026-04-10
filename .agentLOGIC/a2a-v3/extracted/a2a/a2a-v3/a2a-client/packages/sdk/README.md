# A2A Client SDK

## Обзор

SDK (`a2a-client/packages/sdk`) — Express API и логика сессий; клиент для A2A Server.

**Live stack:** For normal full-stack development, start/restart only from the **repository root** (`.\start-all.bat` / `./start-all.sh`). The `npm start` / standalone SDK flow below is for SDK-only work, not for replacing root orchestration.

**Important:** In Vite dev, the **browser usually hits `vite-plugin-a2a` first**, not this process, for `/api/a2a/*`. See [`docs/CLIENT_API_WEB_SDK.md`](../docs/CLIENT_API_WEB_SDK.md).

## Архитектура

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Web UI     │ ───> │ Client API  │ ───> │ A2A Server  │
│ (port 5173) │      │ plugin :5173│      │ (port 3000) │
└─────────────┘      │ or SDK :3001│      └─────────────┘
                     └─────────────┘
```

## Запуск SDK (standalone)

```bash
cd a2a-client/packages/sdk
npm run build   # produces dist/
npm start       # node dist/server/index.js
```

Default: `http://localhost:3001` (override with `PORT` / `CLIENT_API_PORT`).

## API Endpoints (sessions)

Same router is mounted at multiple prefixes:

| Prefix | Notes |
|--------|--------|
| `/api/a2a/sessions` | Matches what `web/` calls when using standalone API |
| `/api/v1/sessions` | Versioned |
| `/api/sessions` | Legacy alias |

| Метод | Путь (example) | Описание |
|-------|----------------|----------|
| POST | `.../sessions` | Создать сессию → **`201`** `{ success, session }` (`id`: body `id` or `sess_<timestamp>`) |
| POST | `.../sessions/:id/next` | Следующий шаг (ack-only; hydrate via GET session + promise poll) |
| GET | `.../sessions/:id` | Состояние сессии |
| GET | `.../sessions` | Список |

## Протокол

Семантика как у **Vite plugin** (`/api/a2a/*`): два шага — сначала **текст задачи**, потом **`choice`** по списку роутера. Подробно: корневой **`AGENTS.md`** → *Router dialog (two beats)*.

### Формат запроса (Web → SDK / Vite)

**Первый ход (направление работы)** — предпочтительно обёртка `result` (как на Vite):

```json
{
  "result": { "message": "описание задачи" },
  "projectId": "id проекта"
}
```

Сокращение: **`task`** как строка = то же, что `result.message`, пока на предыдущем шаге **не** было `execute.form.choices`.

**Второй ход (после роутера)** — `id` из `execute.form.choices` (типовой fallback на сервере: `dialog`, `agent`, `task-decomposition` — см. [`shared/router-static-choices.json`](../../../shared/router-static-choices.json)):

```json
{
  "result": { "choice": "agent" },
  "projectId": "id проекта"
}
```

Сокращение: поле **`task`** со значением **`id`** выбора, если предыдущий шаг уже показывал **choices** (как `buildSubmitResult` в `vite-plugin-a2a`).

Legacy / отдельный маршрут SDK: `POST .../action` с телом `{ "choice": "..." }` — см. `sessions-async.ts`.

### Формат ответа (SDK → Web)

**Форма выбора (execute.form.choices):**
```json
{
  "sessionId": "sess_1700000000000",
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog", "label": "AI діалог з користувачем", "description": "..." },
        { "id": "agent", "label": "Agent (універсальний режим)", "description": "..." },
        { "id": "task-decomposition", "label": "Декомпозиція задачі", "description": "..." }
      ]
    }
  }
}
```

При keyword-match набор `id` может включать, например, **`fix-vue-imports`** (см. серверный router).

**Форма ввода (execute.form):**
```json
{
  "sessionId": "sess_1700000000000",
  "execute": {
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Сообщение", "required": true }
      ]
    }
  }
}
```

**Сообщение (execute.message):**
```json
{
  "sessionId": "sess_1700000000000",
  "execute": {
    "message": "Ответ ассистента"
  }
}
```

## Web интеграция

Текущий `web/` вызывает **`/api/a2a/...`** относительно origin (Vite plugin в dev). Для работы **только** через SDK на 3001 нужен прокси или смена базового URL в коде — см. [`docs/CLIENT_API_WEB_SDK.md`](../docs/CLIENT_API_WEB_SDK.md).

### Состояния UI

| State | Описание |
|-------|----------|
| `idle` | Ожидание ввода |
| `loading` | Загрузка |
| `waiting` | Ожидание от AI |
| `processing` | Обработка |
| `error` | Ошибка |
| `success` | Успех |

## Типы событий

- `message` - новое сообщение
- `task_response` - ответ задачи
- `session_update` - обновление сессии
- `progress` - прогресс
- `status` - изменение статуса
- `complete` - завершено
- `error` - ошибка

