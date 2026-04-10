# Карта коду (Action Map)

> Де який код знаходиться в проекті A2A
>
> **Транспорт:** Web ↔ Client API ↔ Server — **async flow з `promiseId`**.

---

## Огляд структури

```
a2a-script-agent/
├── a2a-client/              # Клієнтська частина
│   ├── packages/            # NPM пакети
│   │   ├── sdk/             # Основний SDK (API клієнт + API сервер)
│   │   ├── rag/             # RAG функціональність
│   │   ├── execution/       # виконання скриптів
│   │   ├── embedding/       # ембедінги
│   │   ├── history/         # історія
│   │   ├── json/           # JSON утиліти
│   │   └── types/           # Спільні типи
│   └── web/                 # Web UI
│       ├── js/               # JavaScript
│       └── css/              # Стилі
├── a2a-server/              # Серверна частина
│   └── src/
│       ├── actions/          # Визначення дій
│       ├── protocol/        # Обробка протоколу
│       ├── routes/           # API endpoints
│       └── services/         # Бізнес-логіка
├── simulations/             # Симуляції
└── docs/new-request-flow/  # Документація архітектури
```

---

## a2a-client/packages/

### sdk

Призначення: Основний SDK який містить HTTP клієнт для зв'язку з a2a-server та HTTP сервер для Web UI (порт 3001)

| Файл                                                                          | Призначення                      |
|-------------------------------------------------------------------------------|----------------------------------|
| [`src/index.ts`](a2a-client/packages/sdk/src/index.ts)                     | Основний експорт, клас ApiClient  |
| [`src/protocol.ts`](a2a-client/packages/sdk/src/protocol.ts)                 | Функції для побудови контексту   |
| [`src/async-client.ts`](a2a-client/packages/sdk/src/async-client.ts)        | Асинхронний клієнт для promiseId |
| [`src/action-handler.ts`](a2a-client/packages/sdk/src/action-handler.ts)    | Обробка відповідей з execute     |
| [`src/session-manager.ts`](a2a-client/packages/sdk/src/session-manager.ts)    | Управління сесіями              |
| [`src/server/index.ts`](a2a-client/packages/sdk/src/server/index.ts)          | Express сервер (API Server)      |

**Ключові методи ApiClient:**

- `createSession(projectId)` - створити сесію
- `sendMessage(sessionId, messages)` - надіслати повідомлення
- `continueSession(sessionId)` - продовжити сесію
- `confirmSession(sessionId, files)` - підтвердити
- `invoke(markdown, context, files)` - викликати дію

**Поточні endpoints Client API (Vite: префікс `/api/a2a`; SDK також монтує `/api/sessions/*`):**

- `POST /api/a2a/sessions` - створити сесію
- `GET /api/a2a/sessions` - список сесій
- `GET /api/a2a/sessions/:sessionId` - отримати сесію
- `POST /api/a2a/sessions/:sessionId/action` - вибрати дію (SDK)
- `POST /api/a2a/sessions/:sessionId/next` - наступний крок (ack + подальший poll `/async`)
- `GET /api/a2a/sessions/:sessionId/async` - опитати async
- `POST /api/a2a/sessions/:sessionId/cancel` - відмінити сесію
- `POST /api/terminal/execute` - виконати команду
- `POST /api/terminal/action` - дія терміналу
- `POST /api/fs/scan` - сканувати директорію
- `POST /api/fs/read` - прочитати файл
- `POST /api/fs/write` - записати файл
- `POST /api/fs/list` - список файлів
- `GET /health` - перевірка здоров'я
- `POST /api/v1/invoke` - проксувати до сервера

---

### rag

Призначення: RAG функціональність (пошук коду)

| Файл              | Призначення       |
|-------------------|-------------------|
| `src/index.ts`    | Основний експорт  |

---

### execution

Призначення: виконання скриптів

| Файл            | Призначення        |
|-----------------|--------------------|
| `src/index.ts`  | Основний експорт   |

---

### embedding

Призначення: ембедінги для векторного пошуку

| Файл            | Призначення        |
|-----------------|--------------------|
| `src/index.ts`  | Основний експорт   |

---

### history

Призначення: історія виконання

| Файл            | Призначення        |
|-----------------|--------------------|
| `src/index.ts`  | Основний експорт   |

---

### json

Призначення: JSON утиліти

| Файл            | Призначення        |
|-----------------|--------------------|
| `src/index.ts`  | Основний експорт   |

---

### types

Призначення: Спільні типи

| Файл            | Призначення        |
|-----------------|--------------------|
| `src/index.ts`  | Основний експорт   |

---

## a2a-server/

### actions/definitions

Призначення: Визначення дій (actions) які може виконати сервер

| Файл                                                                                                    | Призначення                   |
|---------------------------------------------------------------------------------------------------------|-------------------------------|
| [`ai-session-context.md`](a2a-server/src/actions/definitions/ai-session-context.md)                     | Контекст сесії AI             |
| [`dialog.md`](a2a-server/src/actions/definitions/dialog.md)                                             | Діалог з LLM                  |
| [`fix-vue-imports.md`](a2a-server/src/actions/definitions/fix-vue-imports.md)                           | Виправлення Vue імпортів      |
| [`fix-vue-imports-alternatives.md`](a2a-server/src/actions/definitions/auto-ai/fix-vue-imports-alternatives.md) | Альтернативи                  |
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
| `src/routes/requests.ts`  | Управління запитами       |
| `src/routes/sessions.ts`  | Управління сесіями        |
| `src/routes/actions.ts`  | Отримання дій             |

---

### protocol

Призначення: Обробка протоколу A2A

| Файл                         | Призначення             |
|------------------------------|------------------------|
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
| [`js/app/project-manager.js`](a2a-client/web/js/app/project-manager.js) | Управління проектами            |
| [`js/storage.js`](a2a-client/web/js/storage.js) | Сховище даних                     |
| [`js/app/session-manager.js`](a2a-client/web/js/app/session-manager.js) | Управління сесіями              |
| [`js/components/ai-actions.js`](a2a-client/web/js/components/ai-actions.js) | AI Actions                     |
| [`js/web-api-client.js`](a2a-client/web/js/web-api-client.js)   | API клієнт                       |

### Flow UI

| Файл                  | Призначення        |
|-----------------------|--------------------|
| `js/flow/init.js`     | Ініціалізація flow |
| `js/flow/index.js`    | Основний flow      |
| `js/flow/nodes.js`    | Вузли              |
| `js/flow/protocol.js` | Протокол flow      |
| `js/flow/search.js`   | Пошук у flow       |

---

## simulations/

Призначення: Симуляції для тестування протоколу

| Симуляція                  | Призначення                      |
|----------------------------|----------------------------------|
| `fix-vue-imports/`         | Виправлення Vue імпортів         |
| `fix-vue-imports-batched/` | Те саме, batched                 |
| `dialog/`                  | Діалог з LLM                     |
| `agent-coder/`             | Діалог + RAG + read/write файлів |
| `agent-coder-smart/`       | Контекст-документ                |

### Структура симуляції

```
simulation-name/
├── description.md     # Опис
├── analysis.md        # Аналіз workflow
├── 1/
│   ├── request.json   # Запит Client → Server
│   └── response.json  # Відповідь Server → Client
├── 2/
│   └── ...
├── N/
│   ├── request.json   # Запит
│   ├── server-transforms-request.json   # Трансформація запиту (опціонально)
│   ├── request.md     # Markdown для LLM (якщо є)
│   ├── response.md    # Markdown від LLM (якщо є)
│   ├── server-transforms-response.json  # Трансформація відповіді (опціонально)
│   └── response.json  # Відповідь
```

**Порядок:** request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json →
response.json.

---

## docs/new-request-flow/

Призначення: Документація архітектури

| Файл                                                                    | Призначення        |
|-------------------------------------------------------------------------|--------------------|
| [`README.md`](README.md)                               | Бачення системи    |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                   | Архітектура        |
| [`PROTOCOL.md`](PROTOCOL.md)                           | Протокол взаємодії |
| [`SCHEMAS.md`](SCHEMAS.md)                             | Схеми даних        |
| [`SESSION-FLOW.md`](SESSION-FLOW.md)                  | Потік сесій        |
| [`SIMULATION-FORMAT.md`](SIMULATION-FORMAT.md)        | Формат симуляцій   |
| [`ACTION-MAP.md`](ACTION-MAP.md)                      | Цей документ       |

---

## Посилання

- [ARCHITECTURE.md](ARCHITECTURE.md) - Архітектура системи
- [PROTOCOL.md](PROTOCOL.md) - Протокол взаємодії
- [SCHEMAS.md](SCHEMAS.md) - Схеми даних
- [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) - Формат симуляцій
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) - Канонічна схема
- [simulations/REFERENCE.md](../../simulations/REFERENCE.md) - Actions vs AI-Actions бачення з реалізацією
