# Client API Server Documentation

> **⚠️ Важно:** Это документация для обновлённой системы. 
> 
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md)

## Обзор

Client API Server (`a2a-client/packages/api-server`) — это HTTP-сервер, который работает на клиентской машине (порт 3001). Он выступает посредником между Web UI и A2A Server, а также предоставляет доступ к локальным ресурсам (файловая система, терминал).

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT API SERVER                            │
│                     (localhost:3001)                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Роутинг (Express)                                          ││
│  │  - /api/sessions/*                                          ││
│  │  - /api/projects/*                                          ││
│  │  - /api/config                                              ││
│  │  - /api/terminal/*                                          ││
│  │  - /api/v1/* (прокси)                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌──────────────┬────────────┴─────────────┬─────────────────┐  │
│  │ Хранение     │  Проксирование            │  Terminal API   │  │
│  │ проектов     │  к a2a-server             │                 │  │
│  │ и сессий     │  (localhost:3000)         │                 │  │
│  └──────────────┴──────────────────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Точка входа

Основной файл: [`a2a-client/packages/api-server/src/index.ts`](../../a2a-client/packages/api-server/src/index.ts)

## HTTP Routes

### Config API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/config` | Получить конфигурацию |
| `GET` | `/api/v1/config` | Получить конфигурацию (альтернативный путь) |
| `POST` | `/api/config` | Сохранить конфигурацию |
| `POST` | `/api/v1/config` | Сохранить конфигурацию (альтернативный путь) |

#### Конфигурация

```typescript
interface ClientConfig {
    serverUrl: string;      // URL A2A Server (по умолчанию: http://localhost:3000/api/v1)
    token?: string | null; // JWT токен для аутентификации
}
```

### Projects API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/projects` | Получить все проекты |
| `GET` | `/api/v1/projects` | Получить все проекты (альтернативный путь) |
| `POST` | `/api/projects` | Создать проект |
| `POST` | `/api/v1/projects` | Создать проект (альтернативный путь) |
| `DELETE` | `/api/projects/:projectId` | Удалить проект |
| `DELETE` | `/api/v1/projects/:projectId` | Удалить проект (альтернативный путь) |

#### Модель проекта

```typescript
interface Project {
    id: string;           // Уникальный ID (напр., p_<timestamp>)
    name: string;        // Название проекта
    path?: string;       // Путь к проекту на файловой системе
    description?: string;
}
```

### Sessions API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/sessions` | Получить список сессий |
| `GET` | `/api/v1/sessions` | Получить список сессий (альтернативный путь) |
| `POST` | `/api/sessions` | Создать сессию |
| `POST` | `/api/v1/sessions` | Создать сессию (альтернативный путь) |
| `GET` | `/api/sessions/:sessionId` | Получить сессию |
| `GET` | `/api/v1/sessions/:sessionId` | Получить сессию (альтернативный путь) |
| `DELETE` | `/api/sessions/:sessionId` | Удалить сессию |
| `DELETE` | `/api/v1/sessions/:sessionId` | Удалить сессию (альтернативный путь) |
| `POST` | `/api/sessions/:sessionId/action` | Выбрать действие |
| `POST` | `/api/v1/sessions/:sessionId/action` | Выбрать действие (альтернативный путь) |
| `POST` | `/api/sessions/:sessionId/next` | Продолжить выполнение |
| `POST` | `/api/v1/sessions/:sessionId/next` | Продолжить выполнение (альтернативный путь) |
| `POST` | `/api/sessions/:sessionId/cancel` | Отменить выполнение |
| `POST` | `/api/v1/sessions/:sessionId/cancel` | Отменить выполнение (альтернативный путь) |

#### Модель сессии

```typescript
interface Session {
    id: string;                    // Уникальный ID (напр., sess_<uuid>)
    projectId: string;             // ID проекта
    title: string;                 // Название сессии
    task?: string;                 // Описание задачи
    status?: string;              // Статус (PENDING, READY, IN_PROGRESS и т.д.)
    selectedAction?: string;       // Выбранное действие
    context?: Record<string, unknown>;
    lastPromiseId?: string;        // ID асинхронного запроса
    createdAt: string;              // ISO timestamp
    updatedAt: string;              // ISO timestamp
    messages?: unknown[];
}
```

### Files API (для UI панелей)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/projects/:projectId/files/*` | Прочитать файл |
| `GET` | `/api/v1/projects/:projectId/files/*` | Прочитать файл (альтернативный путь) |
| `PUT` | `/api/projects/:projectId/files/*` | Записать файл |
| `PUT` | `/api/v1/projects/:projectId/files/*` | Записать файл (альтернативный путь) |

### Server Proxy API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/v1/invoke` | Проксировать вызов к серверу |
| `*` | `/api/v1/requests*` | Проксировать любой запрос к серверу |
| `GET` | `/api/v1/sse/:sessionId` | Проксировать SSE от сервера |

### Terminal API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/terminal/execute` | Выполнить команду |
| `POST` | `/api/terminal/action` | Выполнить терминальное действие |

### File System API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/fs/scan` | Сканировать директорию |
| `POST` | `/api/fs/read` | Прочитать файл |
| `POST` | `/api/fs/write` | Записать файл |
| `POST` | `/api/fs/list` | Список файлов в директории |
| `POST` | `/api/fs/exists` | Проверить существование пути |
| `GET` | `/api/fs/cwd` | Получить текущую директорию |

#### File System Scan

```typescript
// POST /api/fs/scan
{
    dir: string;              // Директория для сканирования
    options?: {
        ignore?: string[];    // Паттерны для игнорирования
        extensions?: string[]; // Фильтр по расширениям
        maxDepth?: number;    // Максимальная глубина
    }
}
```

#### File System Read

```typescript
// POST /api/fs/read
{
    filePath: string;         // Путь к файлу
    encoding?: string;        // Кодировка (по умолчанию: utf-8)
}

// Ответ:
{
    content: string;          // Содержимое файла
}
```

#### File System Write

```typescript
// POST /api/fs/write
{
    filePath: string;        // Путь к файлу
    content: string;         // Содержимое для записи
}

// Ответ:
{
    success: boolean;
    path: string;
}
```

#### File System List

```typescript
// POST /api/fs/list
{
    dirPath: string;         // Путь к директории
}

// Ответ:
{
    entries: Array<{
        name: string;
        isDirectory: boolean;
        isFile: boolean;
        path: string;
    }>;
}
```

#### File System Exists

```typescript
// POST /api/fs/exists
{
    path: string;            // Путь для проверки
}

// Ответ:
{
    exists: boolean;
    isDirectory?: boolean;
    isFile?: boolean;
}
```

### Health Check

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/health` | Проверить состояние сервиса |

```typescript
// GET /health
// Ответ:
{
    status: string;          // "ok"
    service: string;        // "a2a-client-api"
    timestamp: string;       // ISO timestamp
}
```

### Server-Sent Events (SSE)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/v1/sse/:sessionId` | SSE поток для сессии |
| `GET` | `/api/v1/sse` | Общий SSE поток (heartbeat) |

#### Terminal Execute

```typescript
// POST /api/terminal/execute
{
    command: string;      // Команда для выполнения
    timeout?: number;     // Таймаут в секундах (по умолчанию: 120)
    cwd?: string;         // Рабочая директория
}
```

Ответ:
```typescript
{
    output: string;       // Вывод команды
    exitCode: number;    // Код завершения
    duration: number;    // Время выполнения в мс
}
```

**Безопасность:** Выполняются только безопасные команды. Заблокированные паттерны:
- `rm -rf /`
- `format`
- `del /f /s /q`
- `rmdir /s /q`
- `shutdown`
- `taskkill /f`

## Хранение данных

### Файловая система

Данные хранятся в JSON-файлах:

```
a2a-client/
└── storage/
    ├── config.json    # Конфигурация
    └── projects.json # Список проектов
```

### Сессии

Сессии хранятся в директории проекта:

```
<project-path>/.a2a/sessions/
├── <session-id-1>.json
├── <session-id-2>.json
└── ...
```

## Интеграция с a2a-server

Client API Server использует прямые HTTP запросы (fetch) для связи с A2A Server:

```typescript
// Используется функция serverFetch для прямых запросов к a2a-server
async function serverFetch(
    method: string,
    serverBaseUrl: string,
    pathName: string,
    body: unknown | null = null
): Promise<Response> {
    const cfg = await loadConfig();
    const headers: Record<string, string> = {};
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
    if (body != null) headers['Content-Type'] = 'application/json';

    const url = `${serverBaseUrl.replace(/\/?$/, '')}${pathName}`;
    return fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
    });
}
```

### Проксирование запросов

Client API Server выступает прокси для следующих операций:

1. **Invoke** — `POST /api/v1/invoke` → `a2a-server /invoke`
2. **Requests** — `/api/v1/requests*` → `a2a-server /api/v1/*`
3. **SSE** — `/api/v1/sse/:sessionId` → `a2a-server /sse/:sessionId`

Это позволяет Web UI не знать адрес a2a-server напрямую.

## Перекрёстные ссылки

- [ARCHITECTURE.md](ARCHITECTURE.md) — Общая архитектура системы
- [PROTOCOL.md](PROTOCOL.md) — Протокол взаимодействия
- [SESSION-FLOW.md](SESSION-FLOW.md) — Поток сессий
- [SCHEMAS.md](SCHEMAS.md) — JSON схемы
- [WEB-UI.md](WEB-UI.md) — Web UI
- [API-CLIENT.md](API-CLIENT.md) — HTTP клиент для сервера
- [json-schemas](../../docs/new-request-flow/json-schemas/) — JSON схемы запросов/ответов
