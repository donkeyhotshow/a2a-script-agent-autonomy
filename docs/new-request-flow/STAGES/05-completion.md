# Этап 5: Завершение

## Описание

Финальный этап протокола - сервер сообщает о завершении выполнения действия.

## Направление

**A2A Server → Client API → Web UI**

## Признаки завершения

### 1. Status: completed

В `context.execution` появляется поле `status: "completed"`:

```json
{
  "context": {
    "task": "исправить импорты",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve",
      "status": "completed"
    }
  },
  "execute": {
    "form": {
      "title": "Готово",
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Исправлено 5 файлов"
        }
      ]
    }
  }
}
```

### 2. result.completed

Альтернативный формат - прямая отметка завершения:

```json
{
  "result": {
    "completed": true
  }
}
```

## Поток завершения

```
Server → response.json (status: completed) → Client API → Web UI
```

## Действия после завершения

### Для Actions (Deterministic)
- Показать итоговое сообщение
- Предложить следующие действия (если есть)

### Для AI-Actions
- Завершить диалог
- Предложить начать новую задачу

## Примеры завершения

### Пример 1: Успешное выполнение

```json
{
  "context": {
    "task": "исправить импорты",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve",
      "status": "completed"
    }
  },
  "execute": {
    "message": "✅ Исправлено 5 файлов с импортами"
  }
}
```

### Пример 2: Завершение с формой

```json
{
  "context": {
    "task": "помощь с кодом",
    "execution": {
      "action": "coder",
      "step": "final",
      "status": "completed"
    }
  },
  "execute": {
    "form": {
      "title": "Задача выполнена",
      "choices": [
        { "id": "new-task", "label": "Новая задача" },
        { "id": "continue", "label": "Продолжить диалог" }
      ]
    }
  }
}
```

## Очистка контекста

При завершении сессии:
- Сохранить историю в storage (опционально)
- Очистить временные данные
- Освободить ресурсы

## References

- [PROTOCOL.md](../PROTOCOL.md)
- [SCHEMAS.md](../SCHEMAS.md)
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md)
- [server-invoke-response-execute.schema.json](../json-schemas/server-invoke-response-execute.schema.json)
