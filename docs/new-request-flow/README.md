# Протокол взаимодействия (new-request-flow)

Цель: стандартизировать ответы сервера и обработку ответов клиентом; описать полный поток Web → Client API → Server. 
Термины: **web** — веб-интерфейс клиента (`a2a-client/packages/web`), **клиент** — `a2a-client`, **Client API** — @a2a-client/vite-plugin (порт 5173), **сервер** — `a2a-server` (порт 3000).

> **См.:** [PROTOCOL.md](PROTOCOL.md), [SCHEMAS.md](SCHEMAS.md), [simulations/SCHEMA.md](../../simulations/SCHEMA.md)

## Карта документов (без дублирования)

| Документ | Назначение |
|----------|------------|
| [PROTOCOL.md](PROTOCOL.md) | Норматив: контракты, эндпоинты, action-key |
| [DATA-FLOW.md](DATA-FLOW.md) | Одна головная диаграмма стека + таблица портов |
| [SESSION-FLOW.md](SESSION-FLOW.md) | Router (два удара), жизненный цикл сессии в Client API |
| [INTEGRATION.md](INTEGRATION.md) | Доп. ASCII (состояния сессии, симуляции), быстрый старт |
| [CONTRADICTIONS.md](CONTRADICTIONS.md) | Архив: старые правки расхождений между черновиками |

Глубокий разбор **fix-vue-imports**: [SIMULATION-FIX-VUE-IMPORTS.md](SIMULATION-FIX-VUE-IMPORTS.md) (не дублировать в [SIMULATION-ANALYSIS.md](SIMULATION-ANALYSIS.md)).

## Каноничные источники

| Документ | Описание |
|----------|----------|
| [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) | **Каноничная схема** симуляций - основной источник истины |
| [`simulations/REFERENCE.md`](../../simulations/REFERENCE.md) | Справочник: Actions vs AI-Actions |
| [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md) | Подготовка тела запроса к LLM на сервере (`result` → `history`, `flowControlHint`) |

## Текущая архитектура

- **Web не знает адрес сервера.** Все запросы к серверу идут через Client API (@a2a-client/vite-plugin на порту 5173).
- **Конфигурация на Web:** страница настроек (Settings) для URL Client API; редактор проектов (Projects).
- **Сервер stateless:** не хранит пользовательские сессии; каждый `POST /api/v1/invoke` даёт **`promiseId`**, финальный `execute`/`context` — после опроса результата. Долгоживущие сессии — на стороне Client API (диск).

## Поток задачи (Task Flow): Web → Client API → Server

### Поток (async-only)
- **Server `POST /api/v1/invoke`:** всегда **`promiseId`** в ответе; готовый **`execute` / `context`** — после опроса **`GET /api/v1/requests/{promiseId}/result`**.
- **Client API (Web):** после **`POST …/next`** опрос **`GET /api/a2a/sessions/{id}/async`** (или legacy promise-route), затем гидратация сессии.
- **Поток UI:**
  1. **Web:** поле ввода задачи + кнопка Send → панель с прелоадером
  2. **POST /api/a2a/sessions** (Web → Client API): `{ projectId, task }`
  3. **Client API** сохраняет сессию, проксирует на Server: `{ task }`
  4. **Server** возвращает `{ promiseId, status: "pending" }`
  5. **Client API** опрашивает `GET /api/a2a/sessions/{id}/async` (предпочтительно) или `GET /api/a2a/sessions/{id}/promise/{promiseId}` (legacy)
  6. **После завершения** в ответе появляются `execute` / `context` (форма диалога, роутер с `choices`, и т.д.)
  7. **Client API** возвращает `execute.*` в Web
  8. **Прелоадер скрывается** после финального результата

Дополнительные сценарии:
- [Remote web viewer + local client workflow](REMOTE-CLIENT-WEB.md) — когда ты сидишь на телефоне и весь лог/история остаются на локальном клиенте.

Подробно: [WEB-UI.md](WEB-UI.md), [API-SERVER.md](API-SERVER.md). 
Формат первого запроса к серверу: только `{ task }` (см. [simulations/SCHEMA.md](../../simulations/SCHEMA.md)).
