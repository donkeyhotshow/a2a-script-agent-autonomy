# Детальный разбор этапов симуляции dialog

> **Транспорт:** Web ↔ Client API ↔ Server — **async flow с `promiseId`**.
> Server возвращает `promiseId`, Client API опрашивает статус до `completed`, затем возвращает `execute.*` в Web.

## Обзор

Симуляция `dialog` демонстрирует полный цикл AI-диалога между пользователем и LLM.

## Поток этапов

```
Шаг 1: Инициация → Шаг 2: Выбор → Шаг 3: Диалог → Шаг 4: Завершение
```

---

## Шаг 1: Инициация и роутинг

### Описание
Первичный запрос пользователя с задачей "диалог". Сервер выполняет роутинг и предлагает доступные действия.

### Файлы
- `simulations/dialog/1/client.json`
- `simulations/dialog/1/request.json`
- `simulations/dialog/1/response.json`
- `simulations/dialog/1/received.json`

### Client → Client API (client.json)
```json
{
    "task": "диалог",
    "projectId": "123",
    "sync": true
}
```

### Client API → Server (request.json)
```json
{
  "context": {
    "execution": {
      "action": "task",
      "step": "new"
    }
  },
  "result": {
    "message": "диалог"
  }
}
```

### Server → Client API (response.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "task",
      "step": "router"
    }
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog", "label": "AI діалог з користувачем" },
        { "id": "auto-ai", "label": "AI Action Generator" },
        { "id": "task-decomposition", "label": "Декомпозиція задачі" }
      ]
    }
  }
}
```

### Client API → Web (received.json)
```json
{
    "projectId": "123",
    "sessionId": "456",
    "execute": {
      "form": {
        "title": "Оберіть спосіб виконання",
        "choices": [
          { "id": "dialog", "label": "AI діалог з користувачем" },
          { "id": "auto-ai", "label": "AI Action Generator" },
          { "id": "task-decomposition", "label": "Декомпозиція задачі" }
        ]
      }
    }
}
```

> **Примечание:** Client API получает `promiseId` от Server, опрашивает до `completed`, затем возвращает `execute.*` в Web.

### Ключевые поля
| Поле | Значение | Описание |
|------|----------|----------|
| context.execution.action | "task" | Начальное действие |
| context.execution.step | "router" | Шаг роутинга |
| execute.form.choices | [...] | Список доступных действий |

---

## Шаг 2: Выбор действия (form.choices)

### Описание
Пользователь выбрал "dialog" из списка. Сервер переключает на действие dialog и запрашивает первое сообщение.

### Файлы
- `simulations/dialog/2/client.json`
- `simulations/dialog/2/request.json`
- `simulations/dialog/2/response.json`
- `simulations/dialog/2/received.json`
- `simulations/dialog/2/server-transforms-request.json`
- `simulations/dialog/2/server-transforms-response.json`

### Client → Client API (client.json)
```json
{
    "projectId": "123",
    "sessionId": "456",
    "result": {
        "choice": "dialog"
    }
}
```

### Client API → Server (request.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "task",
      "step": "router"
    }
  },
  "result": {
    "choice": "dialog"
  }
}
```

### Server → Client API (response.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    }
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Повідомлення",
          "required": true
        }
      ]
    }
  }
}
```

### Client API → Web (received.json)
```json
{
    "projectId": "123",
    "sessionId": "456",
    "execute": {
      "form": {
        "input": [
          {
            "name": "message",
            "type": "text",
            "label": "Повідомлення",
            "required": true
          }
        ]
      }
    }
}
```

### Ключевые изменения
| Поле | Было | Стало |
|------|------|-------|
| context.execution.action | "task" | "dialog" |
| context.execution.step | "router" | "request" |
| result.choice | - | "dialog" |
| execute.form | choices | input (поле ввода) |

---

## Шаг 3: Диалог с LLM

### Описание
Пользователь отправил первое сообщение "hello world". LLM обработал и вернул ответ.

### Файлы
- `simulations/dialog/3/client.json`
- `simulations/dialog/3/request.json`
- `simulations/dialog/3/response.json`
- `simulations/dialog/3/received.json`
- `simulations/dialog/3/request.md`
- `simulations/dialog/3/response.md`
- `simulations/dialog/3/server-transforms-request.json`
- `simulations/dialog/3/server-transforms-response.json`

### Client → Client API (client.json)
```json
{
  "projectId": "123",
  "sessionId": "456",
  "result": {
    "message": "hello world"
  }
}
```

### Client API → Server (request.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    }
  },
  "result": {
    "message": "hello world"
  }
}
```

### Server → LLM (request.md)
```markdown
# System Prompt
...

## Context
...

## User Message
hello world
```

### LLM → Server (response.md)
```markdown
hello world
```

### Server → Client API (response.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  },
  "execute": {
    "message": "hello world",
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Повідомлення", "required": true }
      ]
    }
  }
}
```

### Client API → Web (received.json)
```json
{
  "projectId": "123",
  "sessionId": "456",
  "execute": {
    "message": "hello world",
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Повідомлення", "required": true }
      ]
    }
  }
}
```

### Ключевые изменения
| Поле | Значение | Описание |
|------|----------|----------|
| context.execution.step | "request" | LLM обрабатывает запрос |
| context.history | [...] | История диалога |
| execute.message | "hello world" | Ответ LLM |
| execute.form.input | [...] | Поле для следующего ввода |

---

## Шаг 4: Завершение диалога

### Описание
Пользователь поблагодарил ("Дякую!"). LLM определил завершение и установил статус completed.

### Файлы
- `simulations/dialog/4/client.json`
- `simulations/dialog/4/request.json`
- `simulations/dialog/4/response.json`
- `simulations/dialog/4/received.json`
- `simulations/dialog/4/request.md`
- `simulations/dialog/4/response.md`
- `simulations/dialog/4/server-transforms-request.json`
- `simulations/dialog/4/server-transforms-response.json`

### Client → Client API (client.json)
```json
{
  "projectId": "123",
  "sessionId": "456",
  "result": {
    "message": "Дякую!"
  }
}
```

### Client API → Server (request.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  },
  "result": {
    "message": "Дякую!"
  }
}
```

### Server → Client API (response.json)
```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "completed"
    },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" },
      { "role": "user", "message": "Дякую!" }
    ]
  },
  "execute": {
    "message": "hello world",
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Повідомлення", "required": true }
      ]
    }
  }
}
```

### Ключевые изменения
| Поле | Значение | Описание |
|------|----------|----------|
| context.execution.step | "completed" | Диалог завершен |
| context.history | [3 записи] | Полная история |

---

## Схема потока данных

```mermaid
flowchart TD
    subgraph Step1 [Шаг 1: Инициация]
        A1[Web: task="диалог"] --> B1[Client API]
        B1 --> C1[Server: router]
        C1 --> D1[form.choices]
        D1 --> B1
        B1 --> A1
    end
    
    subgraph Step2 [Шаг 2: Выбор]
        A2[Web: choice="dialog"] --> B2[Client API]
        B2 --> C2[Server: action=dialog]
        C2 --> D2[form.input]
        D2 --> B2
        B2 --> A2
    end
    
    subgraph Step3 [Шаг 3: Диалог]
        A3[Web: message="hello"] --> B3[Client API]
        B3 --> C3[Server: LLM request]
        C3 --> D3[LLM]
        D3 --> C3
        C3 --> E3[response + history]
        E3 --> B3
        B3 --> A3
    end
    
    subgraph Step4 [Шаг 4: Завершение]
        A4[Web: message="Дякую!"] --> B4[Client API]
        B4 --> C4[Server: LLM]
        C4 --> D4[step=completed]
        D4 --> B4
        B4 --> A4
    end
```

## Типы переходов между этапами

| Переход | Тип | Условие |
|---------|------|---------|
| Шаг 1 → Шаг 2 | User Choice | result.choice = "dialog" |
| Шаг 2 → Шаг 3 | User Input | result.message = "..." |
| Шаг 3 → Шаг 3 | Loop | Продолжение диалога |
| Шаг 3 → Шаг 4 | Completion | LLM определяет конец |

## References

- [simulations/dialog/description.md](../../../../../simulations/dialog/description.md)
- [simulations/dialog/WORKFLOW.md](../../../../../simulations/dialog/WORKFLOW.md)
- [SCHEMAS.md](../SCHEMAS.md)
- [PROTOCOL.md](../../PROTOCOL.md) — promiseId async flow
- [ADR-0013](../../../adr/ADR-0013-unified-transport-layer.md) — Transport layer (superseded by promiseId)
- [ADR-0014](../../../adr/ADR-0014-transport-fallback-mechanisms.md) — Fallback mechanisms (superseded by promiseId)
