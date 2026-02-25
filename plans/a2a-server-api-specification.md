# API спецификация сервера A2A

> **Относится к:** a2a-server

## Обзор

Документ описывает REST API спецификацию для сервера A2A.

## Base URL

```
Production: https://api.a2a-agent.com
Development: http://localhost:3000
```

## Аутентификация

### JWT Token

```
Authorization: Bearer <token>
```

### API Key

```
X-API-Key: <api_key>
```

## Endpoints

### Requests

#### POST /api/v1/requests

Создание нового запроса.

**Request Body:**
```json
{
  "task": "проанализируй проект",
  "sessionId": "uuid",
  "context": {},
  "codeBlocks": []
}
```

**Response:**
```json
{
  "promiseId": "req_xxx",
  "status": "pending",
  "createdAt": "timestamp"
}
```

- [ ] [Реализовать создание запроса](#реализовать-создание-запроса)
- [ ] [Валидация входных данных](#валидация-входных-данных)
- [ ] [Генерация promiseId](#генерация-promiseid)

#### GET /api/v1/requests/:promiseId

Получение статуса запроса.

**Response:**
```json
{
  "promiseId": "req_xxx",
  "status": "completed|failed|pending",
  "result": {},
  "error": null
}
```

- [ ] [Реализовать получение статуса](#реализовать-получение-статуса)
- [ ] [Обработка ошибок](#обработка-ошибок)

### Sessions

#### GET /api/v1/sessions

Получение списка сессий.

**Query Parameters:**
- `projectId` - ID проекта
- `limit` - лимит (по умолчанию 20)
- `offset` - смещение

**Response:**
```json
{
  "sessions": [],
  "total": 0,
  "hasMore": false
}
```

- [ ] [Реализовать список сессий](#реализовать-список-сессий)
- [ ] [Пагинация](#пагинация)
- [ ] [Фильтрация по проекту](#фильтрация-по-проекту)

#### POST /api/v1/sessions/:sessionId/messages

Отправка сообщения в сессию.

**Request Body:**
```json
{
  "message": {
    "role": "user",
    "content": {
      "type": "text",
      "text": "сообщение"
    }
  }
}
```

- [ ] [Реализовать отправку сообщения](#реализовать-отправку-сообщения)
- [ ] [Валидация](#валидация)

### Projects

#### GET /api/v1/projects

Получение списка проектов.

**Response:**
```json
{
  "projects": []
}
```

- [ ] [Реализовать список проектов](#реализовать-список-проектов)

#### POST /api/v1/projects

Создание проекта.

- [ ] [Реализовать создание проекта](#реализовать-создание-проекта)

## WebSocket

### WS /ws

Real-time коммуникация.

- [ ] [Поддержка WebSocket соединений](#поддержка-websocket-соединений)
- [ ] [Обработка событий](#обработка-событий)
- [ ] [Heartbeat/ping-pong](#heartbeatping-pong)

## Error Responses

### 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token"
  }
}
```

### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Server error"
  }
}
```

- [ ] [Стандартизация формата ошибок](#стандартизация-формата-ошибок)
- [ ] [Логирование ошибок](#логирование-ошибок)

---

### Реализовать создание запроса


### Валидация входных данных


### Генерация promiseId


### Реализовать получение статуса


### Обработка ошибок


### Реализовать список сессий


### Пагинация


### Фильтрация по проекту


### Реализовать отправку сообщения


### Валидация


### Реализовать список проектов


### Реализовать создание проекта


### Поддержка WebSocket соединений


### Обработка событий


### Heartbeat/ping-pong


### Стандартизация формата ошибок


### Логирование ошибок
