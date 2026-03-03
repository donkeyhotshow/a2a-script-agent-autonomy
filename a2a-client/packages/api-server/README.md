# @a2a/api-server

Client API Server - REST API для взаимодействия Web UI с A2A Server.

## Установка

```bash
cd a2a-client/packages/api-server
npm install
npm start
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

## API Endpoints

### Управление конфигурацией
- `GET /api/config` - Получение конфигурации
- `POST /api/config` - Сохранение конфигурации

### Управление проектами
- `GET /api/projects` - Список проектов
- `POST /api/projects` - Создание проекта
- `DELETE /api/projects/:id` - Удаление проекта

### Управление сессиями
- `GET /api/sessions` - Список сессий
- `POST /api/sessions` - Создание сессии
- `GET /api/sessions/:id` - Получение сессии
- `DELETE /api/sessions/:id` - Удаление сессии

### Проксирование
- `POST /api/v1/invoke` - Вызов A2A Server
- `GET/POST/PUT/DELETE /api/v1/requests*` - Проксирование запросов
- `GET /api/v1/sse/:sessionId` - SSE проксирование

### Терминал
- `POST /api/terminal/execute` - Выполнение команды
- `POST /api/terminal/action` - Терминальные действия

### Файловая система
- `POST /api/fs/scan` - Сканирование директории
- `POST /api/fs/read` - Чтение файла
- `POST /api/fs/write` - Запись файла
- `POST /api/fs/list` - Список файлов
- `POST /api/fs/exists` - Проверка существования
- `GET /api/fs/cwd` - Текущая директория

### RAG
- `POST /api/rag/search` - Поиск по документам

### WebSocket
- `WS /?sessionId=:id` - Real-time обновления (порт 3002)

## Примеры

### Выполнение команды терминала

```bash
curl -X POST http://localhost:3001/api/terminal/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "timeout": 60}'
```

### Чтение файла

```bash
curl -X POST http://localhost:3001/api/fs/read \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/file.txt"}'
```

### Создание проекта

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "path": "/path/to/project"}'
```

## Интеграция

API Server используется Web UI (`a2a-client/web/`) для:
- Управления проектами и сессиями
- Выполнения терминальных команд
- Файловых операций
- RAG поиска

## Документация

Подробная документация: [API Server Documentation](../../../docs/new-request-flow/API-SERVER.md)
