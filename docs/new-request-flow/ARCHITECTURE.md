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
> **См.:** [PROTOCOL.md](PROTOCOL.md)

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB (a2a-client/web)                    │
│  - Пользовательский интерфейс                                     │
│  - Управление сессиями через UI                                   │
│  - НЕ знает адрес сервера                                        │
│  - Общается ТОЛЬКО с CLIENT API (localhost:3001)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (a2a-client)                          │
│  - Хранит конфигурацию (provider, projects)                      │
│  - Управляет сессиями                                            │
│  - Знает адрес сервера                                           │
│  - API: localhost:3001                                           │
│  - Содержит пакеты:                                              │
│    - api-client - HTTP клиент для сервера                        │
│    - agent - агент                                               │
│    - fs-utils - файловые утилиты                                 │
│    - rag - RAG функциональность                                  │
│    - script-runner - запуск скриптов                             │
│    - terminal - терминал                                        │
│    - types - общие типы                                          │
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
// a2a-client/web/js/app-enhancements.js:748
const response = await fetch('/api/v1/projects');
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
│          │ HTTP к CLIENT API (localhost:3001)                   │
│          ▼                                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT API (a2a-client)                                         │
│                                                                          │
│  Эндпоинты (порт 3001):                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ POST /api/sessions          - создать сессию                ││
│  │ GET  /api/sessions          - получить список сессий         ││
│  │ GET  /api/sessions/:id     - получить сессию                ││
│  │ POST /api/sessions/:id/task - отправить задачу               ││
│  │ POST /api/sessions/:id/next - следующий шаг                  ││
│  │ POST /api/sessions/:id/cancel - отменить сессию              ││
│  │ GET  /api/projects          - получить список проектов       ││
│  │ POST /api/projects          - создать проект                ││
│  │ GET  /api/config            - получить конфигурацию         ││
│  │ POST /api/config            - сохранить конфигурацию         ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ApiClient (a2a-client/packages/api-client)                  ││
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
│  │ GET  /api/v1/sse/:sessionId - SSE подписка                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Сервер НЕ хранит сессии - только обрабатывает запросы и возвращает    │
│  результаты. Вся логика сессий находится на Client API.                │
└──────────────────────────────────────────────────────────────────┘
```

```

## External AI Hub

External AI Hub - это прокси-сервис, который:

1. Перенаправляет запросы к Ollama (порт 11434 → 11435)
2. Поддерживает асинхронный режим через `promiseId`
3. Может симулировать ответы LLM (для тестирования)
4. Логирует все запросы

### Как работает promiseId

```

1. Server отправляет запрос к External AI Hub с заголовком X-Promise: true
2. Hub сразу возвращает promiseId (статус pending)
3. Server продолжает работу, не дожидаясь ответа от LLM
4. Server периодически опрашивает Hub: GET /promise/{id}
5. Когда статус done → получает результат: GET /promise/{id}/response

```

### Endpoints External AI Hub

| Endpoint | Описание |
|----------|----------|
| GET /health | Проверка здоровья |
| GET /api/tags | Список моделей |
| POST /api/chat | Чат с LLM |
| POST /api/generate | Генерация |
| GET /promise/<id> | Статус promise |
| GET /promise/<id>/response | Результат promise |

### Переменные окружения

```

PROXY_PORT=11434 # Порт прокси
OLLAMA_HOST=http://localhost:11435  # Хост Ollama
SIMULATION_ENABLED=false # Включить симуляцию

```

## Потоки данных

### 1. Создание новой задачи

```

1. USER: вводит задачу в web UI
   │
2. WEB: отправляет POST /api/sessions { projectId, task }
   │
3. CLIENT API:
    - Создает сессию локально (в памяти/файле)
    - Отправляет POST /api/v1/invoke на SERVER
    - SERVER возвращает promiseId
    - CLIENT API сохраняет сессию с **execute.form.choices** (router; формат `actions[]` считается legacy)

   │
4. CLIENT API: возвращает { sessionId, **execute.form.choices** } (router вместо `actions[]`)
   │
5. WEB: отображает панель сессии с **execute.form.choices** (ранее `actions[]`)

```

### 2. Выбор действия

```

1. USER: выбирает действие из **execute.form.choices** (router; `actions[]` — только для старых реализаций)
   │
2. WEB: отправляет POST /api/sessions/:id/action { action }
   │
3. CLIENT API: обновляет состояние сессии
   │
4. WEB: показывает steps[], кнопки "Далее" / "Авто"

```

### 3. Выполнение шагов

```

1. USER: нажимает "Далее"
   │
2. WEB: отправляет POST /api/sessions/:id/next
   │
3. CLIENT API:
    - Отправляет POST /api/v1/invoke { context, result: { choice } } — выбирает опцию из `execute.form.choices`
    - SERVER возвращает execute с script
    - CLIENT API выполняет script
    - CLIENT API сохраняет результаты в сессии
      │
4. CLIENT API: возвращает результат
   │
5. WEB: отображает результат, кнопка "Далее" / "Стоп"

```

### 4. AI запрос через External AI Hub

```

1. SERVER: решает отправить запрос к LLM
   │
2. SERVER → EXTERNAL AI HUB: POST /api/chat { model, messages }
    - Заголовок X-Promise: true
      │
3. EXTERNAL AI HUB:
    - Создает promise (pending)
    - Возвращает promiseId сразу
      │
4. SERVER:
    - Сохраняет promiseId в контексте
    - Продолжает workflow (отправляет execute клиенту)
      │
5. SERVER: периодически опрашивает GET /promise/{id}
   │
6. EXTERNAL AI HUB: возвращает { status: "pending" | "done" }
   │
7. Когда done: SERVER → GET /promise/{id}/response
   │
8. SERVER: использует результат для следующих действий

```

## Файловая структура

### a2a-client/packages/

```

a2a-client/packages/
├── api-client/ # HTTP клиент для сервера
│ ├── src/
│ │ ├── index.ts # основной API
│ │ ├── async-client.ts
│ │ ├── protocol.ts
│ │ └── action-handler.ts
│ └── tests/
│
├── agent/ # Агент
├── fs-utils/ # Файловые утилиты
├── rag/ # RAG
├── script-runner/ # Запуск скриптов
├── terminal/ # Терминал
└── types/ # Общие типы

```

### a2a-client/web/

```

a2a-client/web/
├── js/
│ ├── app-boot.js # Инициализация
│ ├── app-init.js # Настройка app
│ ├── app-state.js # Состояние приложения
│ ├── sessions.js # Управление сессиями (UI)
│ ├── actions-manager.js # Менеджер действий
│ ├── sse-client.js # SSE клиент
│ ├── web-api-client.js # API клиента (NEW!)
│ └── ...
├── css/
│ └── ...
└── index.html

```

## Порты

| Компонент | Порт | Описание |
|-----------|------|----------|
| Server    | 3000 | HTTP API |
| Client API| 3001 | HTTP API для web |
| Web UI    | 5173 | Vite dev server |
| External AI Hub | 11434 | Прокси для Ollama |
| Ollama    | 11435 | Локальная LLM |

## External AI Hub

External AI Hub - это прокси-сервис, который:

1. Перенаправляет запросы к Ollama (порт 11434 → 11435)
2. Поддерживает асинхронный режим через `promiseId`
3. Может симулировать ответы LLM (для тестирования)
4. Логирует все запросы

### Как работает promiseId

```

1. Server отправляет запрос к External AI Hub с заголовком X-Promise: true
2. Hub сразу возвращает promiseId (статус pending)
3. Server продолжает работу, не дожидаясь ответа от LLM
4. Server периодически опрашивает Hub: GET /promise/{id}
5. Когда статус done → получает результат: GET /promise/{id}/response

```

### Endpoints External AI Hub

| Endpoint | Описание |
|----------|----------|
| GET /health | Проверка здоровья |
| GET /api/tags | Список моделей |
| POST /api/chat | Чат с LLM |
| POST /api/generate | Генерация |
| GET /promise/<id> | Статус promise |
| GET /promise/<id>/response | Результат promise |

### Переменные окружения

```

PROXY_PORT=11434 # Порт прокси
OLLAMA_HOST=http://localhost:11435  # Хост Ollama
SIMULATION_ENABLED=false # Включить симуляцию

```

## Переменные окружения

### Server (.env)
```

PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=32-characters-key-here
SKIP_AUTH=1

```

### Client
```

CLIENT_API_URL=http://localhost:3001

```

## Следующие шаги

1. Создать Client API сервер (port 3001)
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
