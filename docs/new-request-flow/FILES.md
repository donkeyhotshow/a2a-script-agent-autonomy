# Карта файлів проекту

> **Транспорт:** Web ↔ Client API ↔ Server — **async flow з `promiseId`**.

## Огляд

Цей документ показує структуру проекту і де який код знаходиться.

## Основні директорії

```
c:/workspace/org-carrier/a2a-script-agent/
├── a2a-client/           # Клієнтська частина
│   ├── packages/        # npm пакети (sdk, rag, execution, embedding, history, json, types)
│   └── web/             # Web UI (порт 5173)
├── a2a-server/          # Серверна частина (порт 3000)
├── ai-integration/    # AI Hub proxy → Ollama (див. порти нижче)
└── docs/new-request-flow/    # Документація та плани
```

---

## A2A Client

### a2a-client/web/

Web інтерфейс (UI). Працює на порту 5173 (Vite dev server).

| Файл                    | Опис                                |
|-------------------------|-------------------------------------|
| `index.html`            | Головна HTML сторінка               |
| `js/storage.js`        | Ініціалізація додатку               |
| `js/`        | Налаштування додатку                |
| `js/app/`               | Основні модулі додатку              |
| `js/session-store.js`   | Сховище сесій                       |
| `js/components/`        | UI компоненти                        |
| `js/web-api-client.js`  | API клієнт для зв'язку з Client API |
| `js/flow/`              | Flow-based UI компоненти            |
| `js/json/`              | JSON UI компоненти                  |
| `css/`                  | Стилі                               |

### a2a-client/packages/

NPM пакети всередині monorepo:

| Пакет           | Шлях                      | Опис                                     |
|-----------------|---------------------------|------------------------------------------|
| `sdk`           | `packages/sdk/`           | Основний SDK (API client + API server) |
| `rag`           | `packages/rag/`           | RAG функціональність                     |
| `execution`    | `packages/execution/`      | Виконання скриптів                      |
| `embedding`     | `packages/embedding/`     | Ембедінги                               |
| `history`       | `packages/history/`       | Історія                                  |
| `json`          | `packages/json/`          | JSON утиліти                            |
| `types`         | `packages/types/`         | Спільні типи                            |
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

## External AI Hub (`ai-integration/`)

Проксі до Ollama: **Hub :11435** → **Ollama :11434**, async `promiseId`. Дерево каталогів і інтеграція з сервером: [SERVER-ARCHITECTURE.md](SERVER-ARCHITECTURE.md#external-ai-hub-integration); контракт promise / endpoints: [PROTOCOL.md](PROTOCOL.md#async-flow-promiseid).

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
| Client API      | 5173 (`/api/a2a/*` на Vite) або 3001 (standalone SDK) | Сесії, проксі на сервер |
| Web UI          | 5173  | Vite dev server                         |
| AI Hub (ai-integration) | 11435 | Проксі / async promise до Ollama |
| Ollama          | 11434 | Локальна LLM                            |

---

## Змінні оточення

### Server (.env)

```
PORT=3000
JWT_SECRET=...
ENCRYPTION_KEY=32-characters-key-here
SKIP_AUTH=1
```

> **Примітка:** Сервер stateless - не потребує бази даних. Всі дані зберігаються на Client API.

### External AI Hub

```
PROXY_PORT=11435
OLLAMA_HOST=http://localhost:11434
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
- [a2a-server/docs/LLM-REQUEST-PREP.md](../../a2a-server/docs/LLM-REQUEST-PREP.md) - підготовка invoke перед `request.md` (history + `flowControlHint`)
