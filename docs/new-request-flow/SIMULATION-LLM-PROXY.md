# LLM Proxy Flow (поток с promiseId)

## Обзор

Когда Server обрабатывает запрос с использованием LLM (например, AI-generated actions), обработка занимает время. В этом
случае Server использует **promiseId** для асинхронной обработки.

## Два типа ответов сервера

Сервер может ответить двумя способами:

### 1. Синхронный ответ (без LLM)

Используется для предопределённых actions (как в fix-vue-imports).

```json
{
  "context": { ... },
  "execute": { "script": { ... } }
}
```

### 2. Асинхронный ответ (с LLM)

Используется когда Server обращается к LLM.

```json
{
  "promiseId": "req_abc123",
  "status": "pending"
}
```

---

## Поток с promiseId

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│  1. Client API отправляет POST /api/v1/invoke { task }                    │
│     на Server                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (a2a-server)                                │
│                                                                              │
│  2. Server отправляет task в LLM (асинхронно)                              │
│                                                                              │
│  3. Server возвращает:                                                      │
│     {                                                                       │
│       "promiseId": "req_abc123",                                          │
│       "status": "pending"                                                  │
│     }                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│  4. Client API сохраняет promiseId в сессию                                 │
│                                                                              │
│  5. Client API опрашивает GET /api/v1/requests/:promiseId/status          │
│     пока не получит status === "completed"                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (a2a-server)                                │
│                                                                              │
│  6. LLM обрабатывает запрос                                                 │
│                                                                              │
│  7. GET /api/v1/requests/:promiseId/status возвращает:                     │
│     { "status": "completed" }                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│  8. Client API получает результат:                                          │
│     GET /api/v1/requests/:promiseId/result                                 │
│                                                                              │
│     Результат:                                                               │
│     {                                                                       │
│       "status": "completed",                                               │
│       "execute": {                                                           │
│         "form": {                                                                │
│           "choices": [...]                                                       │
│         }                                                                        │
│       }                                                                     │
│     }                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│  9. Client API возвращает результат на Web                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API эндпоинты для promiseId

### POST /api/v1/invoke

Создать запрос.

```typescript
// Request
{
  context?: { ... };
  task?: string;
}

// Response (асинхронный)
{
  promiseId: string;
  status: 'pending';
}
```

### GET /api/v1/requests/:promiseId/status

Получить статус запроса.

```typescript
// Response
{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}
```

### GET /api/v1/requests/:promiseId/result

Получить результат (когда status === 'completed').

```typescript
// Response
{
  status: 'completed';
  result: {
    actions?: Action[];
    fallbackActions?: FallbackAction[];
    execute?: { script: { input, output, code } };
    finalResult?: { action: string; summary: any };
  };
}
```

---

## Пример: Первый запрос с LLM

### Request (Client → Server)

```json
{
  "task": "проаналізувати структуру проекту"
}
```

### Response (Server → Client)

```json
{
  "promiseId": "req_llm_abc123",
  "status": "pending"
}
```

---

### Status Check (Client → Server)

```http
GET /api/v1/requests/req_llm_abc123/status
```

```json
{
  "status": "processing",
  "progress": 50
}
```

---

### Status Check (Client → Server)

```http
GET /api/v1/requests/req_llm_abc123/status
```

```json
{
  "status": "completed"
}
```

---

### Result (Client → Server)

```http
GET /api/v1/requests/req_llm_abc123/result
```

```json
{
  "status": "completed",
  "execute": {
    "form": {
      "title": "Оберіть дію",
      "choices": [
        {
          "id": "analyze-structure",
          "label": "Аналіз структури проекту",
          "description": "Аналізує структуру файлової системи проекту"
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator",
          "description": "Згенерувати новий екшен"
        }
      ]
    }
  }
}
```

---

## Когда использовать promiseId

| Сценарий                                   | Использует promiseId? |
|--------------------------------------------|-----------------------|
| Предопределённые actions (fix-vue-imports) | Нет                   |
| AI-generated actions                       | Да                    |
| Сложные запросы к LLM                      | Да                    |
| Долгие операции                            | Да                    |

---

## Ключевые отличия

| Синхронный (без LLM)             | Асинхронный (c LLM)         |
|----------------------------------|-----------------------------|
| Server сразу возвращает response | Server возвращает promiseId |
| Нет обращения к LLM              | Server обращается к LLM     |
| Быстрый ответ                    | Требует опроса status       |
| execute.script сразу в ответе    | execute.script в result     |

---

## Файлы

См. также:

- [`SIMULATION-FIX-VUE-IMPORTS.md`](SIMULATION-FIX-VUE-IMPORTS.md) - синхронный поток без LLM
- [`SIMULATION-coder.md`](SIMULATION-CODER-DIALOG.md) - диалог с RAG + запись файлов
- [`simulations/dialog/`](../../simulations/dialog/) - пример с LLM (требует обновления)

---

## Практика: LLM replay из симуляций (server-only)

Для простого и детерминированного тестирования цепочки **Client → Server** без реального LLM сервер поддерживает
режим реплея ответов из симуляций.

**Переменная окружения:**

- `LLM_REPLAY_DIR` — путь к конкретному шагу симуляции, где уже записан `response.md`.

**Поведение:**

- если `LLM_REPLAY_DIR` **задан**, `llm-adapter` (функция `callLLM`) вместо обращения к внешнему LLM:
  - читает файл `<LLM_REPLAY_DIR>/response.md`;
  - возвращает его содержимое как строку ответа LLM;
  - не делает сетевых вызовов (ни в OpenAI, ни в ai-integration / Ollama).
- если чтение `response.md` не удалось — сервер логирует предупреждение и **возвращается к обычному провайдеру**
  (OpenAI / Ollama / placeholder), чтобы не ломать прод-поток.

**Пример использования с симуляцией:**

- есть шаг симуляции: `simulations/dialog/3/` с заполненными:
  - `request.json`
  - `request.md`
  - `response.md` (записанный ответ LLM)
- запускаем сервер с:

```bash
export LLM_REPLAY_DIR=simulations/dialog/3
npm run dev
```

- клиент (или `sim-run`) отправляет `request.json` из этого шага;
- сервер строит тот же `request.md`, но вызов LLM возвращает содержимое `response.md`;
- вся цепочка `request.json → request.md → response.md → response.json` повторяется **без живой модели**.

Этот режим соответствует ADR про "Simulations as Golden Standard": LLM‑уровень тестируется через
записанные `response.md`, а серверный код можно безопасно рефакторить, сверяясь с фикстурами.

### Требование к `request.md` при replay

При таком replay‑режиме **недостаточно** сравнивать только пару `request.json` / `response.json`:

- на каждом шаге с LLM сервер обязан воспроизводить **точно такой же `request.md`**, как в директории симуляции;
- иначе `response.md` реплеится против другого промпта, и проверка `response.json` перестаёт быть надёжной.

Следовательно, для шагов с LLM пайплайн в симуляциях должен проходить три уровня проверки:

1. `request.json → server-transforms-request.json`
2. `server-transforms-request.json → request.md` (байтово или по устойчивой нормализации)
3. `request.md ↔ response.md` (LLM‑уровень как фиксированные фикстуры)
