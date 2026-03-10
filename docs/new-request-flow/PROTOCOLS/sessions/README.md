# Протоколы сессий (Session)

## Обзор

Сессия представляет собой контекст выполнения задачи пользователя. В A2A протоколе сессия связывает все этапы выполнения от инициации до завершения.

## Жизненный цикл сессии

```mermaid
stateDiagram-v2
  [*] --> created: Создание
  created --> active: Первый запрос
  active --> waiting: Ожидание ввода
  waiting --> active: Получен ввод
  active --> processing: Выполнение
  processing --> active: Результат
  processing --> completed: Успех
  processing --> error: Ошибка
  waiting --> cancelled: Таймаут/Отмена
  completed --> [*]
  error --> [*]
  cancelled --> [*]
```

## Создание сессии

### Request

**Web → Client API:**
```json
{
  "task": "исправить импорты",
  "projectId": "proj_123"
}
```

### Response (Sync Mode)

**Server → Client API:**
```json
{
  "sessionId": "sess_abc123",
  "context": {
    "task": "исправить импорты",
    "execution": {
      "action": "router",
      "step": "init"
    }
  },
  "execute": {
    "form": {
      "choices": [...]
    }
  }
}
```

## Параметры сессии

| Параметр | Тип | Описание |
|----------|-----|----------|
| `sessionId` | string | Уникальный ID сессии |
| `projectId` | string | ID проекта |
| `userId` | string | ID пользователя |
| `createdAt` | timestamp | Время создания |
| `updatedAt` | timestamp | Время обновления |
| `status` | string | Статус сессии |

## Состояния сессии

| Состояние | Описание |
|-----------|----------|
| `created` | Сессия создана |
| `active` | Активна, выполняется |
| `waiting` | Ожидает ввода пользователя |
| `completed` | Успешно завершена |
| `error` | Завершена с ошибкой |
| `cancelled` | Отменена |

## Управление сессией

### Получение сессии

```http
GET /api/sessions/:sessionId
```

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "status": "active",
  "context": {
    "task": "исправить импорты"
  },
  "history": [
    {
      "step": "init",
      "action": "router",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Завершение сессии

```http
DELETE /api/sessions/:sessionId
```

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "status": "completed"
}
```

## Контекст сессии

### Структура context

```json
{
  "context": {
    "task": "описание задачи",
    "projectId": "proj_123",
    "userId": "user_456",
    "execution": {
      "action": "fix-vue-imports",
      "step": "scan",
      "status": "processing"
    },
    "history": [
      {
        "role": "user",
        "message": "исправить импорты"
      },
      {
        "role": "assistant",
        "message": "Выберите действие",
        "action": "form.choices"
      }
    ]
  }
}
```

##see also

- [Sesson Flow](../../SESSION-FLOW.md)
- [Этапы протокола](../STAGES/README.md)
