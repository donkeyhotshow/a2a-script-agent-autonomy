# API Server Documentation

---
doc:
  id: new-request-flow/api-server
  type: spec
  machine_readable: true
  tags: [client-api, http, websocket, fs, terminal, rag]
  references:
    - docs/DOCUMENTATION-MACHINE-READABLE.md
    - docs/new-request-flow/PROTOCOL.md
---

> **⚠️ Важно:** Это документация для Client API Server (порт 3001).
> 
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md), [API-CLIENT.md](API-CLIENT.md)

## Обзор

API Server (`a2a-client/packages/api-server`) — это REST API сервер, который работает на клиентской машине (порт 3001 по умолчанию). Он обеспечивает:

- Управление проектами и сессиями
- Проксирование запросов к A2A Server (порт 3000)
- Выполнение терминальных команд
- Файловые операции
- RAG поиск
- WebSocket для real-time обновлений

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT MACHINE                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   API SERVER (порт 3001)                     ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │  Projects    │  │  Sessions    │  │  Terminal       │  ││
│  │  │  Management  │  │  Management  │  │  Execution      │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │  File System │  │  RAG Search  │  │  WebSocket      │  ││
│  │  │  Operations  │  │  (Meilisearch)│ │  Real-time      │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   A2A SERVER (порт 3000)                     ││
│  │              (проксирование через /api/v1/*)                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Конфигурация

### Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `PORT` | `3001` | HTTP порт сервера |
| `HOST` | `localhost` | Хост сервера |
| `WS_PORT` | `3002` | WebSocket порт |
| `A2A_SERVER_URL` | `http://localhost:3000/api/v1` | URL A2A Server |
| `A2A_SERVER_TOKEN` | - | JWT токен для A2A Server |
| `A2A_CLIENT_STORAGE_DIR` | `./storage` | Директория для хранения данных |
| `RAG_STORAGE_PATH` | `./rag-storage` | Директория для RAG |
| `MEILISEARCH_HOST` | `http://localhost:7700` | Meilisearch хост |
| `MEILISEARCH_API_KEY` | - | Meilisearch API ключ |
| `MEILISEARCH_INDEX` | `code` | Meilisearch индекс |

## Endpoints

### Конфигурация

#### GET /api/config

Получение текущей конфигурации.

**Ответ:**
```json
{
  "serverUrl": "http://localhost:3000/api/v1",
  "token": "..."
}
```

#### POST /api/config

Сохранение конфигурации.

**Тело запроса:**
```json
{
  "serverUrl": "http://localhost:3000/api/v1",
  "token": "your-jwt-token"
}
```

### Проекты

#### GET /api/projects

Получение списка проектов.

**Ответ:**
```json
[
  {
    "id": "p_1234567890",
    "name": "My Project",
    "path": "/path/to/project",
    "description": "Project description"
  }
]
```

#### POST /api/projects

Создание нового проекта.

**Тело запроса:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "path": "/path/to/project"
}
```

**Ответ:**
```json
{
  "id": "p_1234567890",
  "name": "New Project",
  "description": "Project description",
  "path": "/path/to/project"
}
```

#### DELETE /api/projects/:projectId

Удаление проекта.

### Сессии

#### GET /api/sessions?projectId=:projectId

Получение списка сессий проекта.

**Ответ:**
```json
[
  {
    "id": "sess_...",
    "title": "Session Title",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/sessions

Создание новой сессии.

**Тело запроса:**
```json
{
  "projectId": "p_1234567890",
  "title": "New Session",
  "task": "Initial task description"
}
```

#### GET /api/sessions/:sessionId?projectId=:projectId

Получение сессии по ID.

#### DELETE /api/sessions/:sessionId?projectId=:projectId

Удаление сессии.

#### POST /api/sessions/:sessionId/action?projectId=:projectId

Выбор действия в сессии.

**Тело запроса:**
```json
{
  "action": "confirm_action"
}
```

#### POST /api/sessions/:sessionId/next?projectId=:projectId

Продолжение выполнения сессии (отправка на A2A Server).

**Тело запроса:**
```json
{
  "task": "task description",
  "sessionId": "sess_...",
  "projectId": "p_..."
}
```

#### POST /api/sessions/:sessionId/cancel?projectId=:projectId

Отмена сессии.

### Проксирование к A2A Server

#### POST /api/v1/invoke

Проксирование вызова к A2A Server `/invoke`.

**Тело запроса:**
```json
{
  "task": "task description",
  "sessionId": "sess_...",
  "projectId": "p_...",
  "context": {}
}
```

#### GET/POST/PUT/DELETE /api/v1/requests*

Проксирование любых запросов к A2A Server `/requests/*`.

#### GET /api/v1/sse/:sessionId

Проксирование SSE (Server-Sent Events) от A2A Server.

### Терминал

#### POST /api/terminal/execute

Выполнение терминальной команды.

**Тело запроса:**
```json
{
  "command": "ls -la",
  "timeout": 120,
  "cwd": "/path/to/directory"
}
```

**Ответ:**
```json
{
  "output": "total 0\ndrwxr-xr-x  5 user  staff   160 Jan  1 00:00 .\n...",
  "exitCode": 0,
  "duration": 100
}
```

**Безопасность:** Блокируются опасные команды:
- `rm -rf /`
- `format`
- `del /f /s /q`
- `rmdir /s /q`
- `shutdown`
- `taskkill /f`

#### POST /api/terminal/action

Выполнение структурированных терминальных действий.

**Тело запроса:**
```json
{
  "action": "workspace",
  "subAction": "get"
}
```

**Действия:**
- `workspace` - управление рабочей директорией
  - `subAction: "get"` - получить текущую директорию
  - `subAction: "set"`, `path: "/path"` - установить директорию
- `pwd` - получить текущую директорию
- `session` - управление сессией
  - `subAction: "info"` - информация о сессии
  - `subAction: "reset"` - сбросить состояние

### Файловая система

#### POST /api/fs/scan

Сканирование директории.

**Тело запроса:**
```json
{
  "dir": "/path/to/dir",
  "options": {
    "ignore": [".git", "node_modules"],
    "extensions": [".js", ".ts"]
  }
}
```

#### POST /api/fs/read

Чтение файла.

**Тело запроса:**
```json
{
  "filePath": "/path/to/file.txt",
  "encoding": "utf-8"
}
```

**Ответ:**
```json
{
  "content": "file content"
}
```

#### POST /api/fs/write

Запись файла.

**Тело запроса:**
```json
{
  "filePath": "/path/to/file.txt",
  "content": "file content"
}
```

#### POST /api/fs/list

Список файлов в директории.

**Тело запроса:**
```json
{
  "dirPath": "/path/to/dir"
}
```

**Ответ:**
```json
{
  "entries": [
    {
      "name": "file.txt",
      "isDirectory": false,
      "isFile": true,
      "path": "/path/to/dir/file.txt"
    }
  ]
}
```

#### POST /api/fs/exists

Проверка существования пути.

**Тело запроса:**
```json
{
  "path": "/path/to/check"
}
```

**Ответ:**
```json
{
  "exists": true,
  "isDirectory": false,
  "isFile": true
}
```

#### GET /api/fs/cwd

Получение текущей рабочей директории.

### RAG Поиск

#### POST /api/rag/search

Поиск по индексированным документам.

**Тело запроса:**
```json
{
  "query": "search query",
  "limit": 10,
  "filters": {
    "extension": ".js"
  }
}
```

**Ответ:**
```json
{
  "results": [
    {
      "id": "doc_1",
      "content": "...",
      "score": 0.95,
      "metadata": {
        "path": "/path/to/file.js",
        "name": "file.js",
        "extension": ".js",
        "type": "file"
      }
    }
  ],
  "total": 1,
  "query": "search query"
}
```

### Файлы проекта

#### GET /api/projects/:projectId/files/*

Чтение файла проекта.

#### PUT /api/projects/:projectId/files/*

Запись файла в проект.

### WebSocket

#### WS /?sessionId=:sessionId

WebSocket соединение для real-time обновлений сессии.

**Порт:** 3002 (по умолчанию, настраивается через `WS_PORT`)

**Сообщения от клиента:**
```json
// Ping
{ "type": "ping" }

// Subscribe (подписка на обновления - автоматически при подключении)
{ "type": "subscribe" }

// Unsubscribe
{ "type": "unsubscribe" }
```

**Сообщения от сервера:**
```json
// Подтверждение подключения
{
  "type": "connected",
  "sessionId": "sess_...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Pong
{ "type": "pong", "timestamp": "..." }

// Прогресс выполнения
{
  "type": "progress",
  "promiseId": "...",
  "status": "in_progress",
  "progress": 50,
  "message": "Processing...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Примеры использования

### JavaScript (браузер)

```javascript
// Конфигурация
const API_BASE = 'http://localhost:3001/api';

// Создание проекта
async function createProject(name) {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return response.json();
}

// Выполнение команды терминала
async function executeCommand(command) {
  const response = await fetch(`${API_BASE}/terminal/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, timeout: 60 })
  });
  return response.json();
}

// Чтение файла
async function readFile(filePath) {
  const response = await fetch(`${API_BASE}/fs/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  });
  return response.json();
}
```

### WebSocket клиент

```javascript
const ws = new WebSocket('ws://localhost:3002?sessionId=sess_123');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  if (data.type === 'progress') {
    updateProgress(data.progress, data.message);
  }
};

// Ping для проверки соединения
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

## Интеграция с Web UI

API Server интегрирован с Web UI через следующие модули:

- [`session-manager.js`](../../a2a-client/web/js/session-manager.js) - управление сессиями
- [`api-integration.js`](../../a2a-client/web/js/api-integration.js) - API интеграция
- [`terminal-emulator.js`](../../a2a-client/web/js/terminal-emulator.js) - эмулятор терминала
- [`file-transfer.js`](../../a2a-client/web/js/file-transfer.js) - передача файлов
- [`error-handler.js`](../../a2a-client/web/js/error-handler.js) - обработка ошибок

## Запуск сервера

```bash
cd a2a-client/packages/api-server
npm install
npm start
```

Или с переменными окружения:

```bash
PORT=3001 A2A_SERVER_URL=http://localhost:3000/api/v1 npm start
```
