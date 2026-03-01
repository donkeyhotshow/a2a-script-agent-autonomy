# Симуляция: Диалог с AI через External AI Hub

## Обзор

Эта симуляция демонстрирует полный поток, когда **Server** отправляет запросы к **External AI Hub** (прокси для Ollama), который возвращает `promiseId` для асинхронной обработки.

## Компоненты

```
┌─────────┐     ┌──────────┐     ┌─────────────────┐     ┌─────────┐
│   Web   │────▶│ Client   │────▶│     Server      │────▶│External │
│ (UI)    │◀────│  (API)   │◀────│  (A2A Server)   │◀────│ AI Hub  │
└─────────┘     └──────────┘     └─────────────────┘     └────┬────┘
                                                                  │
                                                                  ▼
                                                         ┌─────────────┐
                                                         │   Ollama    │
                                                         │ (port 11435)│
                                                         └─────────────┘
```

## Поток данных

### Шаг 1: Клиент отправляет задачу

**Request (Web → Client API):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "tasks/send",
  "params": {
    "task": {
      "id": "task-001",
      "sessionId": "session-abc123",
      "message": {
        "role": "user",
        "content": "Проанализируй код в src/utils.ts и предложи улучшения"
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "task": {
      "id": "task-001",
      "status": "processing"
    }
  }
}
```

### Шаг 2: Client API → Server (с контекстом)

**Request (Client API → Server):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-2",
  "method": "tasks/send",
  "params": {
    "task": {
      "id": "task-001",
      "sessionId": "session-abc123",
      "message": {
        "role": "user",
        "content": "Проанализируй код в src/utils.ts и предложи улучшения"
      }
    }
  }
}
```

**Response (Server → Client API):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-2",
  "result": {
    "context": {
      "sessionId": "session-abc123",
      "history": [
        {
          "role": "user",
          "content": "Проанализируй код в src/utils.ts и предложи улучшения"
        }
      ]
    },
    "actions": [
      {
        "id": "action-1",
        "name": "ai.analyze",
        "input": {
          "prompt": "Проанализируй код в src/utils.ts и предложи улучшения",
          "model": "llama3"
        },
        "output": {
          "type": "analysis"
        }
      }
    ]
  }
}
```

### Шаг 3: Server отправляет запрос к External AI Hub

Server видит action `ai.analyze` и отправляет запрос к External AI Hub с заголовком `X-Promise: true`:

**Request (Server → External AI Hub):**
```http
POST http://localhost:11434/api/chat HTTP/1.1
Host: localhost:11434
Content-Type: application/json
X-Promise: true

{
  "model": "llama3",
  "messages": [
    {
      "role": "user",
      "content": "Проанализируй код в src/utils.ts и предложи улучшения"
    }
  ],
  "stream": false
}
```

**Response (External AI Hub → Server):**
```http
HTTP/1.1 202 Accepted
Content-Type: application/json
X-Promise-Id: abc123def456

{
  "promiseId": "abc123def456",
  "status": "pending"
}
```

### Шаг 4: Server отправляет execute.script клиенту (пока AI обрабатывается)

**Response (Server → Client API):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-2",
  "result": {
    "context": {
      "sessionId": "session-abc123",
      "history": [
        {
          "role": "user",
          "content": "Проанализируй код в src/utils.ts и предложи улучшения"
        }
      ],
      "pendingPromises": [
        {
          "promiseId": "abc123def456",
          "action": "ai.analyze"
        }
      ]
    },
    "execute": {
      "script": {
        "id": "script-1",
        "code": "console.log('Waiting for AI analysis...');",
        "input": {},
        "output": {
          "type": "status",
          "message": "AI анализ в процессе"
        }
      }
    }
  }
}
```

### Шаг 5: Client API → Web

**Response (Client API → Web):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "task": {
      "id": "task-001",
      "status": "processing",
      "message": {
        "role": "assistant",
        "content": "AI анализ в процессе..."
      }
    }
  }
}
```

### Шаг 6: Server опрашивает External AI Hub о статусе

**Request (Server → External AI Hub):**
```http
GET http://localhost:11434/promise/abc123def456 HTTP/1.1
```

**Response:**
```json
{
  "promiseId": "abc123def456",
  "status": "pending"
}
```

### Шаг 7: Server повторяет опрос (AI обработал)

**Request (Server → External AI Hub):**
```http
GET http://localhost:11434/promise/abc123def456 HTTP/1.1
```

**Response:**
```json
{
  "promiseId": "abc123def456",
  "status": "done",
  "result_status_code": 200,
  "result_content_type": "application/json"
}
```

### Шаг 8: Server получает результат от AI

**Request (Server → External AI Hub):**
```http
GET http://localhost:11434/promise/abc123def456/response HTTP/1.1
```

**Response:**
```json
{
  "model": "llama3",
  "message": {
    "role": "assistant",
    "content": "Вот анализ кода:\n\n1. Функция calculateMetric может быть оптимизирована...\n2. Рекомендую добавить кэширование...\n3. Типизация требует улучшений..."
  },
  "done": true
}
```

### Шаг 9: Server отправляет следующее действие

**Response (Server → Client API):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-3",
  "result": {
    "context": {
      "sessionId": "session-abc123",
      "history": [
        {
          "role": "user",
          "content": "Проанализируй код в src/utils.ts и предложи улучшения"
        },
        {
          "role": "assistant",
          "content": "AI анализ в процессе..."
        }
      ],
      "aiResults": {
        "abc123def456": "Вот анализ кода:\n\n1. Функция calculateMetric..."
      }
    },
    "actions": [
      {
        "id": "action-2",
        "name": "code.apply",
        "input": {
          "file": "src/utils.ts",
          "changes": "Добавлено кэширование в функцию calculateMetric"
        },
        "output": {
          "type": "file",
          "path": "src/utils.ts"
        }
      }
    ]
  }
}
```

## Ключевые моменты

### 1. Асинхронный поток через promiseId

- Server отправляет запрос к External AI Hub с заголовком `X-Promise: true`
- Hub сразу возвращает `promiseId` со статусом `202 Accepted`
- Server НЕ ждёт ответа от AI, а продолжает workflow

### 2. Server - Stateless

- Server не хранит sessionId/projectId - клиент передаёт их в каждом запросе
- Контекст передаётся от клиента и возвращается сервером
- Server использует promiseId для отслеживания асинхронных операций

### 3. Контекст в ответе

- `context.history` - история сообщений
- `context.pendingPromises` - активные promiseId
- `context.aiResults` - результаты от AI

### 4. Polling за результатом

- Server периодически опрашивает `GET /promise/{id}`
- Когда статус `done`, получает результат через `GET /promise/{id}/response`

## Файлы симуляции

```
simulations/
└── analyze-with-ai/
    ├── description.md          # Описание сценария
    ├── request.json             # Начальный запрос
    ├── response.json            # Начальный ответ сервера
    ├── 1/
    │   ├── request.json        # Запрос к External AI Hub
    │   └── response.json       # Ответ с promiseId
    ├── 2/
    │   ├── request.json        # Опрос статуса (pending)
    │   └── response.json        # Статус pending
    ├── 3/
    │   ├── request.json        # Опрос статуса (done)
    │   └── response.json        # Статус done
    ├── 4/
    │   ├── request.json        # Получение результата
    │   └── response.json       # Результат от AI
    └── analysis.md              # Анализ симуляции
```

## External AI Hub Endpoints

| Endpoint | Описание |
|----------|----------|
| `POST /api/chat` | Отправить chat запрос (с X-Promise: true для async) |
| `POST /api/generate` | Отправить generate запрос |
| `GET /promise/<id>` | Получить статус promise |
| `GET /promise/<id>/response` | Получить результат promise |

## Переменные окружения External AI Hub

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| PROXY_PORT | 11434 | Порт прокси |
| OLLAMA_HOST | http://localhost:11435 | Хост Ollama |
| SIMULATION_ENABLED | false | Включить ML симуляцию |
