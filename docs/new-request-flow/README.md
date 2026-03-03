# Протокол взаимодействия (new-request-flow)

Цель: стандартизировать ответы сервера и обработку ответов клиентом; описать полный поток Web → Client API → Server. Термины: **web** — веб-интерфейс клиента (`a2a-client/web`), **клиент** — `a2a-client`, **Client API** — api-server (порт 3001), **сервер** — `a2a-server` (порт 3000).

## Текущая архитектура

- **Web не знает адрес сервера.** Все запросы к серверу идут через Client API (api-server). Web настраивает только URL Client API (в настройках: «Client API URL», по умолчанию `/api/v1` или `http://localhost:3001/api/v1`).
- **Конфигурация на Web:** страница настроек (Settings) для URL Client API; редактор проектов (Projects) — список проектов, от имени которых создаются задачи.

## Поток задачи (Task Flow): Web → Client API → Server

Реализованный поток. Задача создаётся **от имени выбранного проекта**.

1. **Web:** поле ввода задачи + кнопка Send → открывается панель с прелоадером («Creating session…»).
2. **POST /api/v1/sessions** (Web → Client API): тело `{ projectId, task, title }` → Client API сохраняет сессию (в `project.path/.a2a/sessions/` или в `storage/sessions/<projectId>/` при отсутствии path у проекта), возвращает объект сессии с `id` и `projectId`.
3. **Фиксация:** после получения идентификаторов панель переходит в режим пластилина (незакрываемая), отображаются sessionId и projectId.
4. **POST /api/v1/invoke** (Web → Client API): тело `{ task, sessionId, projectId }` → Client API проксирует на сервер только `{ task }`, получает `promiseId`, при наличии sessionId/projectId обновляет сессию (lastPromiseId, статус IN_PROGRESS), возвращает ответ Web.
5. **Опрос:** Web запрашивает **GET /api/v1/requests/:promiseId/status** до `completed`/`failed`, затем **GET /api/v1/requests/:promiseId/result** → в панели отображается первый ответ сервера (context + execute).

Подробно: [WEB-UI.md](WEB-UI.md) (раздел «Поток задачи»), [API-SERVER.md](API-SERVER.md). Формат первого запроса к серверу совпадает с симуляциями: только `{ task }` (см. [simulations/SCHEMA.md](../../simulations/SCHEMA.md)).

## Первый запрос и первый ответ

- **Первый запрос к серверу** — по сути поиск подходящих действий по задаче. В симуляциях первый запрос — только `{ "task": "..." }`. SessionId/projectId хранятся на клиенте (Client API и Web); сервер stateless.
- **Первый ответ** — сервер возвращает, например, `execute.form` с `choices` (список действий). Пример: [simulations/fix-vue-imports/1/response.json](../../simulations/fix-vue-imports/1/response.json). Пользователь выбирает действие (например, fix-vue-imports); дальнейшие шаги — по протоколу (result → следующий request).

## Пример потока по симуляции fix-vue-imports

- Шаг 1: [request.json](../../simulations/fix-vue-imports/1/request.json) (`task`) → [response.json](../../simulations/fix-vue-imports/1/response.json) (form с choices).
- Шаги 2–5: после выбора действия — request/response по шагам, например [2/request.json](../../simulations/fix-vue-imports/2/request.json), [2/response.json](../../simulations/fix-vue-imports/2/response.json), и далее 3, 4, 5.

## Симуляции

Список и схема: каталог **simulations/** и [simulations/SCHEMA.md](../../simulations/SCHEMA.md).

| Симуляция | Описание |
|-----------|----------|
| **fix-vue-imports** | Исправление Vue-импортов (шаги без LLM). |
| **fix-vue-imports-batched** | То же, batched. |
| **dialog** | Диалог с LLM (request.md/response.md в шагах с LLM). |
| **coder** | Диалог + RAG + read-file/write-file. |
| **coder-smart** | Контекст-документ (capture-task → analyze-intent → llm-first-iteration → create-context-document). |

## ADR

- [docs/adr/ADR-0001-simulations-as-golden-standard.md](../adr/ADR-0001-simulations-as-golden-standard.md) — симуляции как «golden standard» для сравнения поведения слоёв.

## Документация

| Документ | Описание |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Архитектура системы |
| [PROTOCOL.md](PROTOCOL.md) | Протокол взаимодействия, action-key shape, Actions vs AI-Actions |
| [WEB-UI.md](WEB-UI.md) | Web UI: потоки, endpoints, панели, Plasticine |
| [API-SERVER.md](API-SERVER.md) | Client API Server: роуты, сессии, хранение, прокси invoke/requests |
| [API-CLIENT.md](API-CLIENT.md) | HTTP-клиент для сервера (api-client) |
| [SESSION-FLOW.md](SESSION-FLOW.md) | Поток сессий |
| [DATA-FLOW.md](DATA-FLOW.md) | Диаграмма потока данных |
| [SCHEMAS.md](SCHEMAS.md) | JSON-схемы |
| [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) | Формат симуляций |
| [simulations/SCHEMA.md](../../simulations/SCHEMA.md) | Каноническая схема симуляций |
