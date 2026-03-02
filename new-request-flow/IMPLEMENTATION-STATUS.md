# Статус реалізації

## Поточний стан

### Що є в new-request-flow (Бачення)

Документи в `new-request-flow/` описують ідеальну архітектуру:

1. **ARCHITECTURE.md** - Повна архітектура системи
2. **PROTOCOL.md** - Протокол взаємодії
3. **SCHEMAS.md** - Схеми даних
4. **SESSION-FLOW.md** - Потік сесій

### Що реалізовано (Поточна система)

```
a2a-client/web/        # Web UI (порт 5173)
a2a-client/packages/api-server/   # Client API (поки НЕ на 3001)
a2a-client/packages/api-client/  # HTTP клієнт для Server
a2a-server/             # Server API (порт 3000)
```

---

## Що вже зроблено

| Компонент       | Стан                 | Нотатки                                                          |
|-----------------|----------------------|------------------------------------------------------------------|
| Server (3000)   | ✅ Готовий            | Stateless потрібен                                               |
| api-client      | ✅ Готовий            | В a2a-client/packages/api-client                                 |
| api-server      | ⚠️ Частковий         | Є в a2a-client/packages/api-server, але немає session management |
| External AI Hub | ✅ Готовий            | Порт 11434                                                       |
| Web → Server    | ❌ Потрібно виправити | Має бути Web → Client API                                        |

---

## Що потрібно виправити

### 1. Web → Server напряму

**По документу:**

```
Web → Client API (3001) → Server (3000)
```

**Як зараз:**

```
Web → Server (3000) напряму
```

**Де виправляти:**

- `a2a-client/web/js/web-api-client.js` - потрібно переписати на Client API
- Потрібно створити Client API сервер на порту 3001

### 2. api-server не має session management

**По документу:**

```
Client API повинен мати:
- POST /api/sessions - створити сесію
- GET /api/sessions - список сесій
- GET /api/sessions/:id - стан сесії
- POST /api/sessions/:id/action - обрати дію
- POST /api/sessions/:id/next - наступний крок
- POST /api/sessions/:id/cancel - відмінити
- GET /api/projects - список проектів
- POST /api/projects - створити проект
- GET /api/config - конфігурація
- POST /api/config - зберегти конфігурацію
```

**Як зараз (a2a-client/packages/api-server):**

```
є тільки:
- /api/terminal/execute
- /api/terminal/action
- /api/fs/scan
- /api/fs/read
- /api/fs/write
- /api/fs/list
- /api/fs/exists
```

---

## План виправлень

### Етап 1: Оновити api-server (пріоритет: ВИСОКИЙ)

**Задачі:**

1. [ ] Змінити порт з 3000 на 3001
2. [ ] Додати endpoints для session management:
    - `POST /api/sessions` - створити сесію
    - `GET /api/sessions` - список сесій
    - `GET /api/sessions/:id` - отримати сесію
    - `POST /api/sessions/:id/action` - обрати дію
    - `POST /api/sessions/:id/next` - наступний крок
    - `POST /api/sessions/:id/cancel` - відмінити
3. [ ] Інтегрувати api-client для зв'язку з Server

### Етап 2: Переписати Web API Client (пріоритет: ВИСОКИЙ)

**Задачі:**

1. [ ] Переписати `a2a-client/web/js/web-api-client.js`
2. [ ] Змінити всі fetch() виклики на Client API

**Було:**

```javascript
const response = await fetch('/api/v1/projects');
```

**Стало:**

```javascript
const response = await fetch('http://localhost:3001/api/projects');
```

### Етап 3: Оновити UI (пріоритет: СЕРЕДНІЙ)

**Задачі:**

1. [ ] Додати панель конфігурації (provider, projects)
2. [ ] Реалізувати панелі сесій (drag & drop, згортання)
3. [ ] Додати кнопки "Відмінити" / "Застосувати"

---

## Куди класти код

### a2a-client/packages/

| Пакет           | Призначення                              |
|-----------------|------------------------------------------|
| `api-client`    | HTTP клієнт для Server                   |
| `api-server`    | HTTP сервер для Web (ПОТРІБНО ДОПОВНИТИ) |
| `agent`         | Агент для виконання задач                |
| `fs-utils`      | Файлові утиліти                          |
| `rag`           | RAG функціональність                     |
| `script-runner` | Запуск скриптів                          |
| `terminal`      | Термінал                                 |
| `types`         | Спільні типи                             |

### a2a-client/web/

| Папка             | Призначення             |
|-------------------|-------------------------|
| `js/flow/`        | Flow UI (nodes, panels) |
| `js/json/`        | JSON UI                 |
| `css/components/` | UI компоненти           |

### a2a-server/

| Папка                      | Призначення         |
|----------------------------|---------------------|
| `src/routes/`              | API endpoints       |
| `src/services/`            | Бізнес-логіка       |
| `src/neurons/`             | Нейрони (AI логіка) |
| `src/protocol/`            | Обробка протоколу   |
| `src/actions/definitions/` | Визначення дій      |

---

## Симуляції

Симуляції знаходяться в папці `simulations/`.

### Формат файлів симуляцій

Кожен крок може містити:

| Файл                            | Напрям               | Опис                                              |
|---------------------------------|----------------------|---------------------------------------------------|
| `request.json`                  | Client → Server      | Запит від клієнта                                 |
| `server-transforms-request.md`  | Server (опціонально) | Трансформація запиту перед відправкою до LLM      |
| `request.md`                    | Server → LLM         | **MARKDOWN** з system prompt!                     |
| `response.md`                   | LLM → Server         | Відповідь від LLM                                 |
| `server-transforms-response.md` | Server (опціонально) | Трансформація відповіді перед поверненням клієнту |
| `response.json`                 | Server → Client      | Відповідь клієнту                                 |

> **Примітка:** Файли `server-transforms-request.md` та `server-transforms-response.md` є опціональними і показують
> серверну обробку/трансформацію даних. Не всі кроки обов'язково містять ці файли.

Формат симуляцій: **simulations/SCHEMA.md**.

---

## Команди для запуску

```bash
# 1. Server (порт 3000)
cd a2a-server && npm run dev

# 2. Client API (порт 3001) - ПОТРІБНО ВПРОВАДДИТИ
cd a2a-client/packages/api-server && npm run dev

# 3. Web UI (порт 5173)
cd a2a-client && npm run dev

# 4. External AI Hub (порт 11434)
cd external-ai-hub && python app/main.py
```

---

## Посилання

- [ARCHITECTURE.md](ARCHITECTURE.md) - Архітектура системи
- [PROTOCOL.md](PROTOCOL.md) - Протокол взаємодії
- [SCHEMAS.md](SCHEMAS.md) - Схеми даних
- [SESSION-FLOW.md](SESSION-FLOW.md) - Потік сесій
- [COMPARISON.md](COMPARISON.md) - Порівняння бачення з реалізацією
- [CURRENT-ISSUES.md](CURRENT-ISSUES.md) - Поточні проблеми
