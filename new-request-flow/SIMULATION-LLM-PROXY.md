# LLM Proxy Flow (поток с promiseId)

## Обзор

Когда Server обрабатывает запрос с использованием LLM (например, AI-generated actions), обработка занимает время. В этом случае Server использует **promiseId** для асинхронной обработки.

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
│       "result": {                                                           │
│         "actions": [...],                                                   │
│         "fallbackActions": [...]                                            │
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
  "result": {
    "actions": [
      {
        "action": "analyze-structure",
        "title": "Аналіз структури проекту",
        "description": "Аналізує структуру файлової системи проекту",
        "priority": 10,
        "matchScore": 0.95,
        "steps": [
          {
            "action": "scan-files",
            "title": "Сканування файлів",
            "description": "Сканує файлову систему",
            "priority": 10,
            "input": "none",
            "output": "file_tree"
          },
          {
            "action": "detect-frameworks",
            "title": "Визначення фреймворків",
            "description": "Визначає технології проекту",
            "priority": 9,
            "input": "file_tree",
            "output": "frameworks[]"
          }
        ]
      }
    ],
    "fallbackActions": [
      {
        "mode": "auto-ai",
        "title": "AI Action Generator",
        "description": "Згенерувати новий екшен",
        "fallbackType": "llm_generation"
      }
    ]
  }
}
```

---

## Когда использовать promiseId

| Сценарий | Использует promiseId? |
|----------|----------------------|
| Предопределённые actions (fix-vue-imports) | Нет |
| AI-generated actions | Да |
| Сложные запросы к LLM | Да |
| Долгие операции | Да |

---

## Ключевые отличия

| Синхронный (без LLM) | Асинхронный (c LLM) |
|---------------------|-------------------|
| Server сразу возвращает response | Server возвращает promiseId |
| Нет обращения к LLM | Server обращается к LLM |
| Быстрый ответ | Требует опроса status |
| execute.script сразу в ответе | execute.script в result |

---

## Файлы

См. также:
- [`SIMULATION-FIX-VUE-IMPORTS.md`](SIMULATION-FIX-VUE-IMPORTS.md) - синхронный поток без LLM
- [`simulations/dialog/`](../../simulations/dialog/) - пример с LLM (требует обновления)
