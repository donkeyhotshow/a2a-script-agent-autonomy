# A2A Client SDK

## Обзор

SDK (пакет `a2a-client/packages/sdk`) выступает как:
- **Сервер для Web** - предоставляет API для веб-клиента
- **Клиент для A2A Server** - пересылает запросы на основной сервер

## Архитектура

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Web UI     │ ───> │  SDK Server │ ───> │ A2A Server  │
│ (port 5173) │      │ (port 3001)│      │ (port 3000) │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Запуск SDK

```bash
cd a2a-client/packages/sdk
npm start
# или
node src/server/index.ts
```

SDK сервер запускается на `http://localhost:3001`

## API Endpoints

### Сессии

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/sessions` | Создать новую сессию |
| POST | `/api/sessions/:sessionId/next` | Отправить запрос (task или choice) |
| GET | `/api/sessions/:sessionId` | Получить состояние сессии |
| GET | `/api/sessions` | Список сессий |

### WebSocket

| Путь | Описание |
|------|----------|
| `ws://localhost:3002` | SSE/WebSocket для real-time обновлений |

## Протокол

### Формат запроса (Web → SDK)

**Начало диалога (task):**
```json
{
  "task": "описание задачи",
  "projectId": "id проекта"
}
```

**Выбор варианта (choice):**
```json
{
  "choice": "id выбранного варианта",
  "projectId": "id проекта"
}
```

### Формат ответа (SDK → Web)

**Форма выбора (execute.form.choices):**
```json
{
  "sessionId": "uuid",
  "execute": {
    "form": {
      "title": "Выберите действие",
      "choices": [
        { "id": "dialog", "label": "AI диалог" },
        { "id": "auto-ai", "label": "Auto AI" }
      ]
    }
  }
}
```

**Форма ввода (execute.form.input):**
```json
{
  "sessionId": "uuid",
  "execute": {
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Сообщение", "required": true }
      ]
    }
  }
}
```

**Сообщение (execute.message):**
```json
{
  "sessionId": "uuid",
  "execute": {
    "message": "Ответ ассистента"
  }
}
```

## Web интеграция

### Настройка URL

В web установите API URL:
```javascript
localStorage.setItem('a2a_clientApiUrl', 'http://localhost:3001/api');
```

### Состояния UI

| State | Описание |
|-------|----------|
| `idle` | Ожидание ввода |
| `loading` | Загрузка |
| `waiting` | Ожидание от AI |
| `processing` | Обработка |
| `error` | Ошибка |
| `success` | Успех |

## Типы событий (SSE)

- `message` - новое сообщение
- `task_response` - ответ задачи
- `session_update` - обновление сессии
- `progress` - прогресс
- `status` - изменение статуса
- `complete` - завершено
- `error` - ошибка
