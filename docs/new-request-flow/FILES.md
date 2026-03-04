# Карта файлів проекту

## Огляд

Цей документ показує структуру проекту і де який код знаходиться.

## Основні директорії

```
c:/workspace/org-carrier/a2a-script-agent/
├── a2a-client/           # Клієнтська частина
│   ├── packages/        # npm пакети (api-client, api-server, fs-utils, rag, etc.)
│   └── web/             # Web UI (порт 5173)
├── a2a-server/          # Серверна частина (порт 3000)
├── ai-integration/    # Проксі для Ollama (порт 11434)
└── docs/new-request-flow/    # Документація та плани
```

---

## A2A Client

### a2a-client/web/

Web інтерфейс (UI). Працює на порту 5173 (Vite dev server).

| Файл                    | Опис                                |
|-------------------------|-------------------------------------|
| `index.html`            | Головна HTML сторінка               |
| `js/app-boot.js`        | Ініціалізація додатку               |
| `js/app-init.js`        | Налаштування додатку                |
| `js/app-state.js`       | Управління станом                   |
| `js/sessions.js`        | Управління сесіями в UI             |
| `js/actions-manager.js` | Менеджер дій                        |
| `js/sse-client.js`      | SSE клієнт для real-time оновлень   |
| `js/web-api-client.js`  | API клієнт для зв'язку з Client API |
| `js/flow/`              | Flow-based UI компоненти            |
| `js/json/`              | JSON UI компоненти                  |
| `css/`                  | Стилі                               |

### a2a-client/packages/

NPM пакети всередині monorepo:

| Пакет           | Шлях                      | Опис                                     |
|-----------------|---------------------------|------------------------------------------|
| `api-client`    | `packages/api-client/`    | HTTP клієнт для Server API               |
| `api-server`    | `packages/api-server/`    | HTTP сервер для Web (ПОТРІБНО ДОПОВНИТИ) |
| `fs-utils`      | `packages/fs-utils/`      | Файлові утиліти                          |
| `rag`           | `packages/rag/`           | RAG функціональність                     |
| `script-runner` | `packages/script-runner/` | Запуск скриптів                          |
| `terminal`      | `packages/terminal/`      | Термінал                                 |
| `types`         | `packages/types/`         | Спільні типи                             |
| `embedding`     | `packages/embedding/`     | Ембедінги                                |

---

## A2A Server

Сервер (поки що не повністю Stateless). Працює на порту 3000.

| Файл/Директорія            | Опис                     |
|----------------------------|--------------------------|
| `src/index.ts`             | Точка входу              |
| `src/server.ts`            | Основний сервер          |
| `src/routes/`              | API маршрути             |
| `src/services/`            | Бізнес-логіка            |
| `src/actions/definitions/` | Визначення дій (actions) |
| `src/protocol/`            | Обробка протоколу        |
| `tests/`                   | Тести                    |

---

## External AI Hub

Проксі-сервіс для Ollama з підтримкою promiseId. Працює на порту 11434.

### Структура

```
ai-integration/
├── proxy/                      # Flask додаток
│   ├── __init__.py            # Flask app
│   ├── __main__.py            # Точка входу
│   ├── config.py              # Конфігурація
│   ├── routes.py              # API маршрути
│   ├── proxy_handler.py       # Обробка запитів
│   ├── ollama_manager.py      # Управління Ollama
│   ├── promises.py            # Promise система
│   ├── ai_hub_config.py      # AI Hub конфіг
│   └── views.py               # Додаткові view
│
├── simulation/                 # ML симуляція
│   ├── config.py              # Конфігурація
│   ├── storage.py             # Зберігання даних
│   ├── learner.py             # Навчання ембедінгів
│   ├── engine.py              # Двигун симуляції
│   └── prompt_manager.py      # Управління промптами
│
├── scripts/                    # Утиліти
│   ├── train.py               # Навчання
│   └── benchmark.py           # Бенчмарки
│
├── docs/                       # Документація
│   └── promise-viewer-plan.md # План UI для promise viewer
│
└── plans/                      # Плани розробки
    └── promise-queue-plan.md   # План черги promise
```

### Ключові endpoints

| Endpoint                 | Метод | Опис               |
|--------------------------|-------|--------------------|
| `/health`                | GET   | Перевірка здоров'я |
| `/api/tags`              | GET   | Список моделей     |
| `/api/chat`              | POST  | Чат з LLM          |
| `/api/generate`          | POST  | Генерація тексту   |
| `/promise/<id>`          | GET   | Статус promise     |
| `/promise/<id>/response` | GET   | Результат promise  |
| `/ollama/status`         | GET   | Статус Ollama      |
| `/ollama/start`          | POST  | Запустити Ollama   |
| `/ollama/stop`           | POST  | Зупинити Ollama    |

### Promise Flow

```
1. Client → Proxy: POST /api/chat { model, messages } + X-Promise: true
2. Proxy → Client: { promiseId: "abc123", status: "pending" } (202)
3. Client → Proxy: GET /promise/abc123
4. Proxy → Client: { promiseId: "abc123", status: "pending" }
   (повторювати поки не done)
5. Client → Proxy: GET /promise/abc123/response
6. Proxy → Client: { response from Ollama }
```

---

## New Request Flow (Документація)

Директорія `docs/new-request-flow/` містить документацію та плани.

### Основні файли

| Файл                                                   | Опис                             |
|--------------------------------------------------------|----------------------------------|
| [`README.md`](README.md)                               | Загальний опис системи           |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                   | Архітектура системи              |
| [`PROTOCOL.md`](PROTOCOL.md)                           | Протокол взаємодії               |
| [`SCHEMAS.md`](SCHEMAS.md)                             | Схеми даних                      |
| [`SESSION-FLOW.md`](SESSION-FLOW.md)                   | Потік сесій                      |
| [`ACTION-MAP.md`](ACTION-MAP.md)                       | Карта коду - де який код         |
| [`SIMULATION-FORMAT.md`](SIMULATION-FORMAT.md)         | Формат симуляцій                 |
| [`FILES.md`](FILES.md)                                 | Цей файл - карта проекту         |

### Симуляції

Канон: **simulations/SCHEMA.md**.

```
simulations/
├── dialog/                    # Діалог з LLM
├── coder/              # Діалог + RAG + read/write файлів
├── coder-smart/               # Контекст-документ (MD)
├── fix-vue-imports/           # Виправлення Vue імпортів
├── fix-vue-imports-batched/
├── analyze/
├── phpunit-deprecations/
└── ...
```

---

## Порти

| Компонент       | Порт  | Опис                                    |
|-----------------|-------|-----------------------------------------|
| Server          | 3000  | A2A Server HTTP API                     |
| Client API      | 3001  | HTTP API для web (ПОТРІБНО ВПРОВАДДИТИ) |
| Web UI          | 5173  | Vite dev server                         |
| External AI Hub | 11434 | Проксі для Ollama                       |
| Ollama          | 11435 | Локальна LLM                            |

---

## Змінні оточення

### Server (.env)

```
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=32-characters-key-here
SKIP_AUTH=1
```

### External AI Hub

```
PROXY_PORT=11434
OLLAMA_HOST=http://localhost:11435
SIMULATION_ENABLED=false
OLLAMA_AUTO_START=true
OLLAMA_IDLE_TIMEOUT=300
```

---

## Наступні кроки

1. **Інтеграція External AI Hub в Server**: Server повинен відправляти запити до Hub з X-Promise: true
2. **Polling логіка**: Додати періодичний опитування promise статусу
3. **Обробка результатів**: Коли promise done, використовувати результат для наступних дій
4. **UI оновлення**: Показувати статус "AI обробляє..." поки promise pending

---

## Посилання

- [ARCHITECTURE.md](ARCHITECTURE.md) - Архітектура системи
- [PROTOCOL.md](PROTOCOL.md) - Протокол взаємодії
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) - Канонічна схема симуляцій
