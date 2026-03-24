# Архитектура системы A2A

---
doc:
  id: new-request-flow/architecture
  type: spec
  machine_readable: true
  tags: [architecture, client, server, web, ports]
  references:
    - docs/DOCUMENTATION-MACHINE-READABLE.md
    - docs/new-request-flow/PROTOCOL.md
---

## Обзор

Система состоит из трёх основных компонентов:

> **⚠️ Важно:** Старый формат (`actions[]`, `executingAction`, `actionId`) устарел.
> Используйте `execute.form.choices` для первого ответа и action-key shape для execute/result.
> 
> **Транспорт:** Web ↔ Client API ↔ Server — **async flow с `promiseId`**. Server возвращает `promiseId`,
> Client API опрашивает статус до `completed`, затем возвращает `execute.*` в Web.
> 
> **См.:** [PROTOCOL.md](PROTOCOL.md)

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB (a2a-client/web)                    │
│  - Пользовательский интерфейс                                     │
│  - Управление сессиями через UI                                   │
│  - НЕ знает адрес сервера                                        │
│  - Общается только с Client API (Vite 5173 `/api/a2a/*` или SDK :3001) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (a2a-client)                          │
│  - Хранит конфигурацию (provider, projects)                      │
│  - Управляет сессиями                                            │
│  - Знает адрес сервера                                           │
│  - API: см. выше (не ходит на a2a-server напрямую)                │
│  - Содержит пакеты:                                              │
│    - sdk - Основной SDK                                           │
│    - rag - RAG функциональность                                   │
│    - execution - выполнение скриптов                              │
│    - embedding - эмбеддинги                                       │
│    - history - история                                            │
│    - json - JSON утилиты                                          │
│    - types - общие типы                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (a2a-server) - STATELESS               │
│  - НЕ хранит сессии (stateless)                                  │
│  - Только обрабатывает запросы и возвращает результаты          │
│  - HTTP сервер: localhost:3000                                   │
│  - API: /api/v1/*                                               │
│  - Обрабатывает задачи                                          │
│  - Возвращает предложения действий (actions)             │
│  - Выполняет steps                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Текущая проблема (НЕПРАВИЛЬНО)

В текущей реализации web напрямую обращается к серверу:

```javascript

```

Это **НЕПРАВИЛЬНО** по следующим причинам:

1. Web не должен знать о существовании сервера
2. Web не может обрабатывать ответы сервера (actions, execute)
3. Нарушается принцип разделения ответственности

## Правильная архитектура

```
┌──────────────────────────────────────────────────────────────────┐
│  WEB                                                            │
│  ┌────────────────┐    ┌────────────────┐    ┌───────────────┐  │
│  │ TaskInput      │    │ SessionPanel   │    │ ConfigPanel  │  │
│  │ (новая задача) │    │ (панель сессии)│    │ (настройки)  │  │
│  └───────┬────────┘    └───────┬────────┘    └───────┬───────┘  │
│          │                    │                     │           │
│          ▼                    ▼                     ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  WEB STATE (client-side)                                    ││
│  │  - sessions[] - массив сессий                               ││
│  │  - activeSessionId                                          ││
│  │  - projectId                                                ││
│  │  - provider                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│          │                                                       │
│          │ HTTP к Client API (5173 /api/a2a или SDK :3001)        │
│          ▼                                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT API (a2a-client)                                         │
│                                                                          │
│  Эндпоинты (Web / Vite — префикс /api/a2a):                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ POST /api/a2a/sessions        - создать сессию               ││
│  │ GET  /api/a2a/sessions        - список сессий                 ││
│  │ GET  /api/a2a/sessions/:id   - получить сессию               ││
│  │ POST /api/a2a/sessions/:id/next - следующий шаг             ││
│  │ GET  /api/a2a/sessions/:id/async - опрос async (web UI)       ││
│  │ GET  /api/a2a/projects       - список проектов                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ApiClient (a2a-client/packages/sdk)                             ││
│  │ - Знает адрес сервера (localhost:3000)                      ││
│  │ - Создает сессии на сервере                                  ││
│  │ - Отправляет задачи                                          ││
│  │ - Обрабатывает ответы (actions, execute)           ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  SERVER (a2a-server)                                             │
│                                                                          │
│  HTTP сервер (порт 3000) - STATELESS:                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ POST /api/v1/invoke          - основной эндпоинт            ││
│  │ POST /api/v1/requests       - создать запрос                ││
│  │ GET  /api/v1/requests/:id/status   - статус запроса         ││
│  │ GET  /api/v1/requests/:id/result   - результат запроса      ││
│  │ DELETE /api/v1/requests/:id - отменить запрос              ││
│  │ GET  /api/v1/actions/:id   - получить действие             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Сервер НЕ хранит сессии - только обрабатывает запросы и возвращает    │
│  результаты. Вся логика сессий находится на Client API.                │
└──────────────────────────────────────────────────────────────────┘
```

## External AI Hub

Прокси **ai-integration** (**:11435** → Ollama **:11434**), async через **`promiseId`**. Поток и таблица endpoint’ов: [PROTOCOL.md → Async flow](PROTOCOL.md#async-flow-promiseid); интеграция на стороне сервера: [SERVER-ARCHITECTURE.md → External AI Hub Integration](SERVER-ARCHITECTURE.md#external-ai-hub-integration).

## Потоки данных

Пошаговые сценарии сессии и контракты: [SESSION-FLOW.md](SESSION-FLOW.md), [PROTOCOL.md](PROTOCOL.md). Асинхронный вызов LLM через Hub: [PROTOCOL.md → Async flow](PROTOCOL.md#async-flow-promiseid).

## Файловая структура

Дерево каталогов и назначение модулей: [FILES.md](FILES.md).

## Порты

Сводная таблица: [DATA-FLOW.md → компоненты и порты](DATA-FLOW.md#component-ports); краткий перечень: [AGENTS.md → Default Ports](../../AGENTS.md#default-ports).

## Переменные окружения

Сервер, клиент, ключи, AI: [AGENTS.md → Environment Variables](../../AGENTS.md#environment-variables).

## Следующие шаги

1. Поднять Client API (Vite plugin на 5173 или SDK на 3001)
2. Переписать web-api-client.js для обращения к Client API
3. Добавить sessionId и projectId во все запросы
4. Реализовать хранение сессий на стороне клиента
5. Обновить UI для работы с панелями сессий

## Перекрёстные ссылки

- [SERVER-ARCHITECTURE.md](SERVER-ARCHITECTURE.md) — Server-centric documentation
- [DATA-FLOW.md](DATA-FLOW.md) — Полная диаграмма потока данных
- [WEB-UI.md](WEB-UI.md) — Web UI документация
- [API-SERVER.md](API-SERVER.md) — Client API Server документация
- [API-CLIENT.md](API-CLIENT.md) — API Client документация
- [PROTOCOL.md](PROTOCOL.md) — Протокол взаимодействия
- [SESSION-FLOW.md](SESSION-FLOW.md) — Поток сессий
- [SCHEMAS.md](SCHEMAS.md) — JSON схемы
- [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) — Формат симуляций
- [SIMULATION-LLM-PROXY.md](SIMULATION-LLM-PROXY.md) — Async flow с promiseId
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) — Каноничная схема симуляций
