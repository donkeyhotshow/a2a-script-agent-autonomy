# Карта коду (Action Map)

> Де який код знаходиться в проекті A2A

---

## Огляд структури

```
a2a-script-agent/
├── a2a-client/              # Клієнтська частина
│   ├── packages/            # NPM пакети
│   │   ├── api-client/      # HTTP клієнт для Server
│   │   ├── api-server/      # HTTP сервер для Web
│   │   ├── fs-utils/        # Файлові утиліти
│   │   ├── rag/             # RAG функціональність
│   │   ├── script-runner/   # Запуск скриптів
│   │   ├── terminal/        # Термінал
│   │   └── types/           # Спільні типи
│   └── web/                 # Web UI
│       ├── js/              # JavaScript
│       └── css/             # Стилі
├── a2a-server/              # Серверна частина
│   └── src/
│       ├── actions/         # Визначення дій
│       ├── protocol/        # Обробка протоколу
│       ├── routes/          # API endpoints
│       └── services/        # Бізнес-логіка
├── simulations/             # Симуляції
└── new-request-flow/       # Документація архітектури
```

---

## a2a-client/packages/

### api-client

Призначення: HTTP клієнт для зв'язку з a2a-server

| Файл                                                                            | Призначення                      |
|---------------------------------------------------------------------------------|----------------------------------|
| [`src/index.ts`](a2a-client/packages/api-client/src/index.ts)                   | Основний експорт, клас ApiClient |
| [`src/protocol.ts`](a2a-client/packages/api-client/src/protocol.ts)             | Функції для побудови контексту   |
| [`src/async-client.ts`](a2a-client/packages/api-client/src/async-client.ts)     | Асинхронний клієнт для promiseId |
| [`src/action-handler.ts`](a2a-client/packages/api-client/src/action-handler.ts) | Обробка відповідей з execute     |

**Ключові методи ApiClient:**

- `createSession(projectId)` - створити сесію
- `sendMessage(sessionId, messages)` - надіслати повідомлення
- `continueSession(sessionId)` - продовжити сесію
- `confirmSession(sessionId, files)` - підтвердити
- `invoke(markdown, context, files)` - викликати дію

---

### api-server

Призначення: HTTP сервер для Web UI (має бути на порту 3001)

| Файл                                                          | Призначення    |
|---------------------------------------------------------------|----------------|
| [`src/index.ts`](a2a-client/packages/api-server/src/index.ts) | Express сервер |

**Поточні endpoints:**

- `POST /api/terminal/execute` - виконати команду
- `POST /api/terminal/action` - дія терміналу
- `POST /api/fs/scan` - сканувати директорію
- `POST /api/fs/read` - прочитати файл
- `POST /api/fs/write` - записати файл
- `POST /api/fs/list` - список файлів
- `GET /health` - перевірка здоров'я

**ПОТРІБНО ДОДАТИ:**

- Session management endpoints (див. new-request-flow/PROTOCOL.md)

---

### fs-utils

Призначення: Файлові утиліти

| Файл             | Призначення       |
|------------------|-------------------|
| `src/index.ts`   | Експорт функцій   |
| `src/scanner.ts` | Сканування файлів |
| `src/walker.ts`  | Обхід директорій  |

---

### rag

Призначення: RAG функціональність (пошук коду)

| Файл              | Призначення       |
|-------------------|-------------------|
| `src/index.ts`    | Основний експорт  |
| `src/bm25.ts`     | BM25 пошук        |
| `src/semantic.ts` | Семантичний пошук |
| `src/hybrid.ts`   | Гібридний пошук   |

---

### script-runner

Призначення: Запуск скриптів

| Файл            | Призначення        |
|-----------------|--------------------|
| `src/index.ts`  | Основний експорт   |
| `src/runner.ts` | Виконання скриптів |

---

## a2a-server/

### actions/definitions

Призначення: Визначення дій (actions) які може виконати сервер

| Файл                                                                                                    | Призначення                   |
|---------------------------------------------------------------------------------------------------------|-------------------------------|
| [`ai-session-context.md`](a2a-server/src/actions/definitions/ai-session-context.md)                     | Контекст сесії AI             |
| [`dialog.md`](a2a-server/src/actions/definitions/dialog.md)                                             | Діалог з LLM                  |
| [`fix-vue-imports.md`](a2a-server/src/actions/definitions/fix-vue-imports.md)                           | Виправлення Vue імпортів      |
| [`fix-vue-imports-alternatives.md`](a2a-server/src/actions/definitions/fix-vue-imports-alternatives.md) | Альтернативи                  |
| [`fix-vue-imports-improvements.md`](a2a-server/src/actions/definitions/fix-vue-imports-improvements.md) | Покращення                    |
| `analysis/*.md`                                                                                         | Аналізи різних типів проектів |
| `context/*.md`                                                                                          | Контекст документація         |
| `fallback/*.md`                                                                                         | Fallback дії                  |
| `generation/*.md`                                                                                       | Генерація коду                |
| `graph/*.md`                                                                                            | Граф залежностей              |
| `hybrid/*.md`                                                                                           | Гібридні дії                  |
| `yaml/actions/*.yaml`                                                                                   | YAML визначення дій           |

**Два типи дій:** **actions** — кроки захардкоджені, сервер перемикає; **ai-actions** — список доступних кроків,
наступний з відповіді LLM, можливий окремий запит на крок.

**Структура action definition:**

- `Description` - опис
- `Priority` - пріоритет
- `Context` - тип контексту
- `Triggers` - тригери
- `SubActions` - піддії з TypeScript кодом

---

### routes

Призначення: API endpoints сервера

| Файл                     | Призначення               |
|--------------------------|---------------------------|
| `src/routes/invoke.ts`   | Основний endpoint /invoke |
| `src/routes/sessions.ts` | Управління сесіями        |
| `src/routes/actions.ts`  | Отримання дій             |

---

### protocol

Призначення: Обробка протоколу A2A

| Файл                         | Призначення             |
|------------------------------|-------------------------|
| `src/protocol/validator.ts`  | Валідація запитів       |
| `src/protocol/serializer.ts` | Серіалізація відповідей |

---

### services

Призначення: Бізнес-логіка

| Файл                              | Призначення   |
|-----------------------------------|---------------|
| `src/services/action.service.ts`  | Виконання дій |
| `src/services/llm-hub.service.ts` | Зв'язок з LLM |

---

## a2a-client/web/

Призначення: Web інтерфейс користувача

### Основні файли

| Файл                                                            | Призначення                      |
|-----------------------------------------------------------------|----------------------------------|
| [`js/app-boot.js`](a2a-client/web/js/app-boot.js)               | Ініціалізація додатку            |
| [`js/app-init.js`](a2a-client/web/js/app-init.js)               | Налаштування app                 |
| [`js/app-state.js`](a2a-client/web/js/app-state.js)             | Стан додатку                     |
| [`js/sessions.js`](a2a-client/web/js/sessions.js)               | Управління сесіями (UI)          |
| [`js/actions-manager.js`](a2a-client/web/js/actions-manager.js) | Менеджер дій                     |
| [`js/web-api-client.js`](a2a-client/web/js/web-api-client.js)   | API клієнт (ПОТРІБНО ПЕРЕПИСАТИ) |
| [`js/sse-client.js`](a2a-client/web/js/sse-client.js)           | SSE клієнт                       |

### Flow UI

| Файл                  | Призначення        |
|-----------------------|--------------------|
| `js/flow/init.js`     | Ініціалізація flow |
| `js/flow/index.js`    | Основний flow      |
| `js/flow/nodes.js`    | Вузли              |
| `js/flow/protocol.js` | Протокол flow      |
| `js/flow/search.js`   | Пошук у flow       |

### JSON UI

| Файл                 | Призначення |
|----------------------|-------------|
| `js/json/ui.js`      | JSON UI     |
| `js/json/adapter.js` | Адаптер     |

---

## simulations/

Призначення: Симуляції для тестування протоколу

| Симуляція                  | Призначення                      |
|----------------------------|----------------------------------|
| `fix-vue-imports/`         | Виправлення Vue імпортів         |
| `fix-vue-imports-batched/` | Те саме, batched                 |
| `dialog/`                  | Діалог з LLM                     |
| `coder/`                   | Діалог + RAG + read/write файлів |
| `coder-smart/`             | Контекст-документ                |

### Структура симуляції

```
simulation-name/
├── description.md     # Опис
├── analysis.md       # Аналіз workflow
├── 1/
│   ├── request.json  # Запит Client → Server
│   └── response.json # Відповідь Server → Client
├── 2/
│   └── ...
├── N/
│   ├── request.json  # Запит
│   ├── server-transforms-request.md   # Трансформація запиту (опціонально)
│   ├── request.md    # Markdown для LLM (якщо є)
│   ├── response.md   # Markdown від LLM (якщо є)
│   ├── server-transforms-response.md  # Трансформація відповіді (опціонально)
│   └── response.json # Відповідь
```

**Порядок:** request.json → server-transforms-request.md → request.md → response.md → server-transforms-response.md →
response.json.

---

## new-request-flow/

Призначення: Документація архітектури

| Файл                                                                    | Призначення        |
|-------------------------------------------------------------------------|--------------------|
| [`README.md`](new-request-flow/README.md)                               | Бачення системи    |
| [`ARCHITECTURE.md`](new-request-flow/ARCHITECTURE.md)                   | Архітектура        |
| [`PROTOCOL.md`](new-request-flow/PROTOCOL.md)                           | Протокол взаємодії |
| [`SCHEMAS.md`](new-request-flow/SCHEMAS.md)                             | Схеми даних        |
| [`SESSION-FLOW.md`](new-request-flow/SESSION-FLOW.md)                   | Потік сесій        |
| [`COMPARISON.md`](new-request-flow/COMPARISON.md)                       | Порівняння         |
| [`CURRENT-ISSUES.md`](new-request-flow/CURRENT-ISSUES.md)               | Поточні проблеми   |
| [`IMPLEMENTATION-STATUS.md`](new-request-flow/IMPLEMENTATION-STATUS.md) | Статус реалізації  |
| [`ACTION-MAP.md`](new-request-flow/ACTION-MAP.md)                       | Цей документ       |

---

## Посилання

- [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) - Статус реалізації
- [CURRENT-ISSUES.md](CURRENT-ISSUES.md) - Поточні проблеми
- [COMPARISON.md](COMPARISON.md) - Порівняння бачення з реалізацією
