# Протокол состояния: completed

## Описание

Состояние `completed` означает успешное завершение выполнения задачи.

## Когда используется

- Все действия выполнены успешно
- AI ответил на запрос
- Задача завершена

## Формат

### Server → Client API

```json
{
  "context": {
    "execution": {
      "status": "completed",
      "action": "dialog",
      "step": "final"
    }
  },
  "execute": {
    "message": "✅ Задача выполнена"
  }
}
```

### Альтернативный формат

```json
{
  "result": {
    "completed": true
  },
  "execute": {
    "form": {
      "title": "Задача выполнена",
      "choices": [
        { "id": "new-task", "label": "Новая задача" },
        { "id": "close", "label": "Закрыть" }
      ]
    }
  }
}
```

## Типы завершения

### 1. Простое сообщение

```json
{
  "context": {
    "execution": {
      "status": "completed"
    }
  },
  "execute": {
    "message": "✅ Файл сохранен"
  }
}
```

### 2. С формой выбора

```json
{
  "context": {
    "execution": {
      "status": "completed"
    }
  },
  "execute": {
    "form": {
      "title": "Задача выполнена",
      "choices": [
        { "id": "new-task", "label": "Новая задача" },
        { "id": "continue", "label": "Продолжить" }
      ]
    }
  }
}
```

### 3. С данными

```json
{
  "context": {
    "execution": {
      "status": "completed"
    }
  },
  "execute": {
    "form": {
      "title": "Результат",
      "input": [
        {
          "name": "result",
          "type": "text",
          "label": "Проанализировано 5 файлов"
        }
      ]
    }
  }
}
```

## UI отображение

### Client API → Web UI

```json
{
  "execute": {
    "ui": {
      "state": "success",
      "message": "✅ Задача выполнена"
    }
  }
}
```

## Client API поведение

### Обработка завершения

```javascript
function handleCompleted(response) {
  // Логируем завершение
  logCompletion();
  
  // Если есть execute с формой - показываем
  if (response.execute?.form) {
    showForm(response.execute.form);
  } 
  // Если есть message - показываем сообщение
  else if (response.execute?.message) {
    showMessage(response.execute.message, 'success');
  }
  
  // Очищаем состояние
  clearLoadingState();
}
```

## Примеры

### Пример 1: Успешное сохранение

**Server → Client API:**
```json
{
  "context": {
    "execution": {
      "action": "write-file",
      "step": "save",
      "status": "completed"
    }
  },
  "execute": {
    "message": "✅ Файл src/utils/helper.ts сохранен"
  }
}
```

### Пример 2: Завершение диалога

**Server → Client API:**
```json
{
  "context": {
    "execution": {
      "action": "dialog",
      "step": "final",
      "status": "completed"
    }
  },
  "execute": {
    "message": "Анализ завершен. Найдено 3 потенциальных проблемы.",
    "form": {
      "title": "Что делать дальше?",
      "choices": [
        { "id": "fix", "label": "Исправить проблемы" },
        { "id": "details", "label": "Подробнее" },
        { "id": "new", "label": "Новая задача" }
      ]
    }
  }
}
```

### Пример 3: Promise результат

**Polling result:**
```json
{
  "promiseId": "promise_123",
  "status": "completed",
  "result": {
    "message": "Проанализировано 10 файлов"
  }
}
```

## Связанные файлы

- [Этап 5: Завершение](../../STAGES/05-completion.md)
- [UI-COMMANDS.md](../../json-schemas/UI-COMMANDS.md)

## Следующий шаг

После completed:
- Если есть choices → ожидание выбора пользователя
- Если нет → сессия завершается
- Переход к завершению сессии
