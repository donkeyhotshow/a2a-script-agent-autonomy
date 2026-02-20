# A2A Server API Specification

## Обзор

Спецификация REST API для серверной части A2A системы.

**Base URL:** `http://localhost:3000/api/v1`

**Protocol:** HTTP + WebSocket для real-time обновлений

---

## 1. Аутентификация

### 1.1 Регистрация клиента

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Client Name",
  "email": "client@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "client_123",
    "name": "Client Name",
    "email": "client@example.com",
    "api_key": "sk_a2a_xxx..."
  }
}
```

### 1.2 Получение токена

```http
POST /auth/token
Content-Type: application/json

{
  "email": "client@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token...",
    "refresh_token": "refresh_token...",
    "expires_in": 3600
  }
}
```

---

## 2. Управление проектами

### 2.1 Регистрация проекта

```http
POST /projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Laravel Project",
  "git_url": "git@github.com:user/project.git",
  "branch": "main",
  "ssh_key": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
  "description": "E-commerce platform"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "My Laravel Project",
    "git_url": "git@github.com:user/project.git",
    "branch": "main",
    "status": "pending_indexing",
    "created_at": "2026-02-19T12:00:00Z"
  }
}
```

### 2.1.1 Webhook для Git-репозиториев

```http
POST /projects/:id/webhook
X-Git-Event: push
X-Git-Signature: sha256=...

{
  "ref": "refs/heads/main",
  "repository": {
    "clone_url": "git@github.com:user/project.git"
  },
  "commits": [
    {
      "id": "abc123",
      "added": ["app/Services/NewService.php"],
      "modified": ["app/Models/User.php"],
      "removed": []
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "indexed_files": 3,
    "status": "indexing_started"
  }
}
```

### 2.2 Список проектов

```http
GET /projects
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "proj_123",
        "name": "My Laravel Project",
        "status": "indexed",
        "files_count": 245,
        "last_indexed": "2026-02-19T11:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "per_page": 20
  }
}
```

### 2.3 Статус индексации

```http
GET /projects/:id/indexing-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "indexing",
    "progress": 75,
    "files_processed": 184,
    "files_total": 245,
    "current_file": "app/Services/PaymentService.php",
    "errors": []
  }
}
```

### 2.4 Архитектурные особенности проекта

```http
GET /projects/:id/architecture
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "standard_structure": true,
    "features": [
      "Services расположены в app/Domain/*/Services вместо app/Services",
      "Модели в app/Domain/*/Models вместо app/Models",
      "Отсутствует директория resources/js/Pages — страницы в resources/views/pages"
    ],
    "detected_frameworks": ["laravel", "inertia", "vue", "tailwind"],
    "custom_directories": [
      "app/Domain",
      "config/domain"
    ]
  }
}
```

---

## 3. Управление сессиями

### 3.1 Создание сессии

```http
POST /sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "project_id": "proj_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "proj_123",
    "status": "created",
    "created_at": "2026-02-19T12:00:00Z"
  }
}
```

### 3.2 Отправка сообщения (new_task)

```http
POST /sessions/:id/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "new_task": [
    "Добавить валидацию email при регистрации пользователя",
    "hint: UserService.php содержит логику регистрации",
    "hint: RegisterController.php обрабатывает запрос"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "tasks": [
      {
        "id": "task_001",
        "type": "analyze",
        "status": "in_progress",
        "target": "app/Services/UserService.php",
        "progress": 0
      }
    ],
    "request_files": [
      "app/Services/UserService.php",
      "app/Http/Controllers/Auth/RegisterController.php"
    ]
  }
}
```

### 3.3 Отправка файлов

```http
POST /sessions/:id/files
Authorization: Bearer {token}
Content-Type: application/json

{
  "version": "1.0",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "files": [
    {
      "path": "app/Services/UserService.php",
      "content": "<?php\n\nnamespace App\\Services;\n\nclass UserService\n{\n    public function register(array $data)\n    {\n        return User::create($data);\n    }\n}"
    },
    {
      "path": "app/Http/Controllers/Auth/RegisterController.php",
      "content": "<?php\n\nnamespace App\\Http\\Controllers\\Auth;\n\nclass RegisterController\n{\n    // ...\n}"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "tasks": [
      {
        "id": "task_001",
        "type": "refactor",
        "status": "in_progress",
        "target": "app/Services/UserService.php",
        "progress": 50
      }
    ],
    "updated_files": [
      {
        "path": "app/Services/UserService.php",
        "content": "<?php\n\nnamespace App\\Services;\n\nclass UserService\n{\n    public function register(array $data)\n    {\n        $validator = Validator::make($data, [\n            'email' => ['required', 'email', 'unique:users,email'],\n        ]);\n        // ...\n    }\n}"
      }
    ],
    "request_files": [
      "app/Services/UserService.php"
    ]
  }
}
```

### 3.4 Продолжение сессии (кнопка "Делаем")

```http
POST /sessions/:id/continue
Authorization: Bearer {token}
Content-Type: application/json

{
  "version": "1.0",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "continue": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "tasks": [
      {
        "id": "task_001",
        "type": "refactor",
        "status": "completed",
        "target": "app/Services/UserService.php",
        "progress": 100
      }
    ],
    "message": "Валидация email добавлена в UserService.php"
  }
}
```

### 3.5 Подтверждение изменений

```http
POST /sessions/:id/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "version": "1.0",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "confirm": true,
  "files": [
    {
      "path": "app/Services/UserService.php",
      "content": "// текущее содержимое файла после применения правок"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "confirmed": true,
    "tasks": [
      {
        "id": "task_001",
        "type": "refactor",
        "status": "completed",
        "progress": 100
      }
    ]
  }
}
```

### 3.6 Статус сессии

```http
GET /sessions/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "proj_123",
    "status": "active",
    "tasks": [
      {
        "id": "task_001",
        "type": "refactor",
        "status": "completed",
        "progress": 100
      }
    ],
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:15:00Z"
  }
}
```

---

## 4. WebSocket API

### 4.1 Подключение

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/sessions/:id?token=jwt_token');
```

### 4.2 События сервера

| Событие | Описание | Payload |
|---------|----------|---------|
| `task:progress` | Прогресс задачи | `{ task_id, progress, status }` |
| `task:completed` | Задача завершена | `{ task_id, result }` |
| `files:updated` | Файлы обновлены | `{ files: [...] }` |
| `files:requested` | Запрос файлов | `{ paths: [...] }` |
| `session:completed` | Сессия завершена | `{ summary }` |
| `error` | Ошибка | `{ code, message }` |

### 4.3 Пример потока

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant GitService
    participant MLService
    
    Client->>Server: POST /sessions/:id/message
    Server->>MLService: Analyze query
    MLService->>Server: Search results
    Server->>Client: request_files
    Client->>Server: POST /sessions/:id/files
    Server->>GitService: Get file content
    Server->>MLService: Process files
    MLService->>Server: Updated files
    Server->>Client: WebSocket: files:updated
    Client->>Server: POST /sessions/:id/confirm
    Server->>Client: WebSocket: task:completed
```

---

## 5. Поиск по коду

### 5.1 Семантический поиск

```http
POST /projects/:id/search
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "найти все методы создания пользователя",
  "filters": {
    "file_types": ["php", "vue"],
    "directories": ["app/Services", "resources/js"],
    "exclude": ["tests", "vendor"]
  },
  "options": {
    "limit": 20,
    "min_score": 0.5,
    "include_context": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "file": "app/Services/UserService.php",
        "score": 0.92,
        "matches": [
          {
            "line_start": 15,
            "line_end": 20,
            "content": "public function createUser...",
            "highlight": "<mark>createUser</mark>",
            "context_score": 0.85
          }
        ],
        "metadata": {
          "framework": "laravel",
          "type": "service",
          "last_modified": "2024-01-15T10:30:00Z"
        }
      }
    ],
    "total": 5,
    "query_time_ms": 45,
    "algorithm_used": "hybrid_rrf"
  }
}
```

---

## 6. Health Check

### 6.1 Базовый health check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T12:00:00Z",
  "version": "1.0.0"
}
```

### 6.2 Детальный health check

```http
GET /health/detailed
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T12:00:00Z",
  "version": "1.0.0",
  "components": {
    "database": {
      "status": "ok",
      "latency_ms": 5
    },
    "redis": {
      "status": "ok",
      "latency_ms": 2
    },
    "plexe": {
      "status": "ok",
      "models_loaded": 3
    },
    "queue": {
      "status": "ok",
      "pending_jobs": 5,
      "workers": 3
    }
  }
}
```

---

## 7. Коды ошибок

| Код | Описание |
|-----|----------|
| `AUTH_001` | Неверный токен авторизации |
| `AUTH_002` | Токен истёк |
| `PROJECT_001` | Проект не найден |
| `PROJECT_002` | Ошибка клонирования репозитория |
| `PROJECT_003` | SSH ключ невалиден |
| `SESSION_001` | Сессия не найдена |
| `SESSION_002` | Сессия уже завершена |
| `SESSION_003` | Неверный формат context блока |
| `FILE_001` | Файл не найден в проекте |
| `FILE_002` | Ошибка применения изменений |
| `ML_001` | Ошибка индексации |
| `ML_002` | Ошибка поиска |
| `RATE_001` | Превышен лимит запросов |

### Пример ошибки

```json
{
  "success": false,
  "error": {
    "code": "SESSION_003",
    "message": "Invalid context block format",
    "details": {
      "field": "new_task",
      "reason": "new_task must be a non-empty array"
    }
  }
}
```

---

## 8. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/*` | 10 requests | 1 minute |
| `/sessions/:id/message` | 30 requests | 1 minute |
| `/sessions/:id/files` | 60 requests | 1 minute |
| `/projects/:id/search` | 100 requests | 1 minute |
| Other | 200 requests | 1 minute |

Headers в ответе:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1708358400
```

---

**Версия:** 1.0  
**Дата:** 2026-02-19
