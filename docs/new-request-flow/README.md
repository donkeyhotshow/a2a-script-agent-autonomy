# Протокол взаимодействия (new-request-flow)

Цель: стандартизировать ответы сервера и обработку ответов клиентом; описать полный поток Web → Client API → Server. 
Термины: **web** — веб-интерфейс клиента (`a2a-client/web`), **клиент** — `a2a-client`, **Client API** — api-server (порт 3001), **сервер** — `a2a-server` (порт 3000).

> **⚠️ Важно:** Старый формат (`actions[]`, `proposedActions`, `subActions`, `executingAction`, `dslScript`) устарел. 
> Используйте `execute.form.choices` для первого ответа и action-key shape. 
> 
> **См.:** [PROTOCOL.md](PROTOCOL.md), [SCHEMA.md](SCHEMA.md), [simulations/SCHEMA.md](../../simulations/SCHEMA.md)

## Каноничные источники

| Документ | Описание |
|----------|----------|
| [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) | **Каноничная схема** симуляций - основной источник истины |
| [`simulations/REFERENCE.md`](../../simulations/REFERENCE.md) | Справочник: Actions vs AI-Actions |

## Текущая архитектура

- **Web не знает адрес сервера.** Все запросы к серверу идут через Client API (api-server). 
- **Конфигурация на Web:** страница настроек (Settings) для URL Client API; редактор проектов (Projects).
- **Сервер полностью STATELESS** - не хранит сессии!

## Поток задачи (Task Flow): Web → Client API → Server

1. **Web:** поле ввода задачи + кнопка Send → панель с прелоадером
2. **POST /api/v1/sessions** (Web → Client API): `{ projectId, task }` **[OUTDATED: актуальный эндпоинт — `POST /api/sessions`]**
3. **Client API** сохраняет сессию, проксирует на Server только `{ task }`
4. **Server** возвращает `execute.form.choices` (первый ответ) или `execute.*` (последующие)
5. **Опрос:** Client API опрашивает promiseId до completed, возвращает Web

Дополнительные сценарии:
- [Remote web viewer + local client workflow](REMOTE-CLIENT-WEB.md) — когда ты сидишь на телефоне и весь лог/история остаются на локальном клиенте.

Подробно: [WEB-UI.md](WEB-UI.md), [API-SERVER.md](API-SERVER.md). 
Формат первого запроса к серверу: только `{ task }` (см. [simulations/SCHEMA.md](../../simulations/SCHEMA.md)).
