# Протокол состояния: cancelled

## Описание

Состояние `cancelled` означает, что задача была отменена пользователем или системой.

## Статус

❌ **Не реализовано** - запланировано

## Когда используется

- Пользователь нажал "Отмена"
- Таймаут ожидания пользователя
- Система отменила задачу

## Формат

### Server → Client API

```json
{
  "context": {
    "execution": {
      "status": "cancelled",
      "reason": "USER_CANCELLED"
    }
  },
  "execute": {
    "message": "Задача отменена"
  }
}
```

## Типы отмены

### 1. Пользователь отменил

```json
{
  "context": {
    "execution": {
      "status": "cancelled",
      "reason": "USER_CANCELLED"
    }
  }
}
```

### 2. Таймаут

```json
{
  "context": {
    "execution": {
      "status": "cancelled",
      "reason": "TIMEOUT"
    }
  }
}
```

### 3. Системная отмена

```json
{
  "context": {
    "execution": {
      "status": "cancelled",
      "reason": "SYSTEM_CANCELLED",
      "details": "Ресурсы исчерпаны"
    }
  }
}
```

## UI отображение

```json
{
  "execute": {
    "ui": {
      "state": "cancelled",
      "message": "Задача отменена",
      "actions": [
        { "id": "new-task", "label": "Новая задача" }
      ]
    }
  }
}
```

## Причины отмены

| Причина | Описание |
|---------|----------|
| `USER_CANCELLED` | Пользователь отменил |
| `TIMEOUT` | Таймаут ожидания |
| `SYSTEM_CANCELLED` | Система отменила |
| `SESSION_ENDED` | Сессия завершена |

## TODO

- [ ] Реализация обработки отмены
- [ ] Cleanup ресурсов
- [ ] Уведомление пользователя

## Связанные файлы

- [Этап 5: Завершение](../../STAGES/05-completion.md)
