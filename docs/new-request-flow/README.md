# Протокол взаимодействия (new-request-flow)

Цель: стандартизировать ответы сервера и обработку ответов клиентом; описать полный поток Web → Client API → Server. 
Термины: **web** — веб-интерфейс клиента (`a2a-client/packages/web`), **клиент** — `a2a-client`, **Client API** — @a2a-client/vite-plugin (порт 5173), **сервер** — `a2a-server` (порт 3000).

> **См.:** [PROTOCOL.md](PROTOCOL.md), [SCHEMAS.md](SCHEMAS.md), [simulations/SCHEMA.md](../../simulations/SCHEMA.md)

## Key Documentation

- **[PROTOCOL.md](PROTOCOL.md)**: Core contracts, endpoints, and action-key shapes
- **[DATA-FLOW.md](DATA-FLOW.md)**: System architecture diagram and port mapping
- **[SESSION-FLOW.md](SESSION-FLOW.md)**: Router beats and Client API session lifecycle
- **[INTEGRATION.md](INTEGRATION.md)**: Additional diagrams and quick start guides

## Canonical Sources

- **Schema**: [`../../simulations/SCHEMA.md`](../../simulations/SCHEMA.md)
- **Actions Reference**: [`../../simulations/REFERENCE.md`](../../simulations/REFERENCE.md)
- **LLM Request Preparation**: [`../../a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md)

## Текущая архитектура

- **Web не знает адрес сервера.** Все запросы к серверу идут через Client API (@a2a-client/vite-plugin на порту 5173).
- **Конфигурация на Web:** страница настроек (Settings) для URL Client API; редактор проектов (Projects).
- **Сервер stateless:** не хранит пользовательские сессии; каждый `POST /api/v1/invoke` даёт **`promiseId`**, финальный `execute`/`context` — после опроса результата. Долгоживущие сессии — на стороне Client API (диск).

## Task Flow: Web → Client API → Server

See [SESSION-FLOW.md](SESSION-FLOW.md) for detailed router beats and session lifecycle. For UI-specific flows, see [WEB-UI.md](WEB-UI.md) and [API-SERVER.md](API-SERVER.md).

Additional scenarios: [Remote web viewer + local client workflow](REMOTE-CLIENT-WEB.md).
