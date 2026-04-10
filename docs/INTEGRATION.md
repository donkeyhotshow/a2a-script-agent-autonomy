# Интеграция компонентов и диаграммы

> **⚠️ Важно:** Это документация для обновлённой системы.
> 
> **Транспорт:** Web ↔ Client API ↔ Server — **async flow с `promiseId`**.
> 
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md)

## Общая диаграмма потока данных

Головная диаграмма стека (Web → Client API → A2A Server → Hub, порты) — **[DATA-FLOW.md](DATA-FLOW.md)** — здесь не дублируется.

## Диаграмма потока сессии

```
┌──────────┐     ┌─────────┐     ┌──────────────┐     ┌────────────────────┐
│ PENDING  │────▶│  READY  │────▶│ IN_PROGRESS  │────▶│ COMPLETED          │
└──────────┘     └─────────┘     └──────────────┘     └────────────────────┘
     │                │                  │                         ▲
     │                │                  │                         │
     │                │                  ├────────────┐            │
     │                │                  ▼            ▼            │
     │                │           ┌──────────────┐ ┌─────────┐      │
     │                │           │ WAITING_     │ │  ERROR  │──────┘
     │                │           │ CONFIRMATION │ └─────────┘
     │                │           └──────────────┘
     │                │
     │                │     ┌─────────┐
     └───────────────▶│ CANCELLED │
                         └─────────┘
```

## Диаграмма выполнения действий

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   request   │────▶│   server     │────▶│   response  │────▶│  result     │
│   (JSON)    │     │  (stateless)│     │   (JSON)    │     │  (JSON)     │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                         │                                               │
                         │                                               │
                         ▼                                               │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        execute.* типы                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   form   │  │  message │  │  script  │  │ read-file│  │   rag-   │  │
│  │          │  │          │  │          │  │          │  │  search  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Симуляции в потоке

Симуляции используются как "золотые следы" (golden traces) для тестирования и воспроизведения поведения системы.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         СИМУЛЯЦИЯ                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  simulations/<simulation-name>/                                      │ │
│  │  ├── request.json          (входной запрос)                         │ │
│  │  ├── request.md            (подготовленный для LLM)                 │ │
│  │  ├── response.md           (ответ LLM)                              │ │
│  │  ├── response.json         (финальный ответ)                        │ │
│  │  └── expected/             (ожидаемые результаты)                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ТРУБОПРОВОД СИМУЛЯЦИИ                                    │
│                                                                              │
│  request.json ──▶ server-transforms-request.json ──▶ request.md           │
│                                                                      │      │
│                                                                      ▼      │
│  response.json ◀─ server-transforms-response.json ◀─ response.md          │
│         │                                                                      │
│         ▼                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ВЕРИФИКАЦИЯ: Сравнение с expected/                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Связь с протоколом

**Action-key shape**, эндпоинты и примеры — **[PROTOCOL.md](PROTOCOL.md)**. Перечень действий по типам — **[PROTOCOLS/actions/README.md](PROTOCOLS/actions/README.md)**.

Кратко: в каждом объекте `execute` / `result` — **ровно один** ключ имени действия; первый экран маршрутизации — `execute.form.choices`, ответ пользователя — `result.choice` (см. router в `PROTOCOL.md`).

## JSON Схемы

См. [json-schemas/](json-schemas/) и [SCHEMAS.md](SCHEMAS.md):

| Файл | Назначение |
|------|------------|
| `server-invoke-request.schema.json` | Схема запроса |
| `server-invoke-response-execute.schema.json` | Схема ответа с execute |
| `server-invoke-response-first-form.schema.json` | Схема первого ответа с формой |
| `server-invoke-response-pending.schema.json` | Схема ожидающего ответа (с promiseId) |
| `server-transform.schema.json` | Схема трансформации |

## Перекрёстные ссылки между документами

```
ARCHITECTURE.md
    │
    ├──▶ WEB-UI.md
    │       │
    │       ├──▶ js/app/session-manager.js (Web UI)
    │       ├──▶ js/storage.js
    │       ├──▶ js/web-api-client.js
    │       └──▶ [API-SERVER.md]
    │
    ├──▶ API-SERVER.md
    │       │
    │       ├──▶ sdk/src/server/index.ts
    │       ├──▶ [API-CLIENT.md]
    │       └──▶ [WEB-UI.md]
    │
    ├──▶ API-CLIENT.md
    │       │
    │       ├──▶ sdk/src/index.ts
    │       ├──▶ sdk/src/async-client.ts
    │       ├──▶ sdk/src/protocol.ts
    │       └──▶ [API-SERVER.md]
    │
    ├──▶ PROTOCOL.md
    │       │
    │       ├──▶ action-key shape
    │       ├──▶ execute.* типы
    │       └──▶ json-schemas/
    │
    ├──▶ SESSION-FLOW.md
    │       │
    │       ├──▶ Состояния сессии
    │       └──▶ Полный поток
    │
    ├──▶ DATA-FLOW.md
    │       └──▶ главная диаграмма стека
    │
    ├──▶ SIMULATION-FORMAT.md
    │       │
    │       ├──▶ Формат симуляции
    │       └──▶ Трубопровод
    │
    └──▶ [INTEGRATION.md] (этот файл)
            │
            ├──▶ Диаграммы сессии / действий (ниже в файле)
            └──▶ json-schemas/
```

## Быстрый старт

### Запуск компонентов

```bash
# 1. A2A Server (порт 3000)
cd a2a-server && npm run dev

# 2. Client API (Vite 5173 /api/a2a или SDK порт 3001)
cd a2a-client/packages/sdk && npm run dev

# 3. Web UI (порт 5173)
cd a2a-client && npm run dev
```

### Использование

1. Откройте Web UI: `http://localhost:5173`
2. Создайте проект (укажите путь к проекту)
3. Настройте Server URL в Config (по умолчанию: `http://localhost:3000/api/v1`)
4. Создайте новую сессию
5. Введите задачу и отправьте

### Тестирование с симуляцией

```bash
# Запуск симуляции
cd a2a-server && npm run sim:run <simulation-name>

# Проверка результатов
npm run sim:report <simulation-name>
```

## Ссылки на исходный код

| Компонент | Путь |
|-----------|------|
| Web UI | [`a2a-client/web/`](../../a2a-client/web/) |
| Client API Server | [`a2a-client/packages/sdk/`](../../a2a-client/packages/sdk/) |
| API Client | [`a2a-client/packages/sdk/`](../../a2a-client/packages/sdk/) |
| A2A Server | [`a2a-server/src/`](../../a2a-server/src/) |
| Симуляции | [`simulations/`](../../simulations/) |
