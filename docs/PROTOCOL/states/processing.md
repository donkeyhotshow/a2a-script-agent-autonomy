# Протокол состояния: processing

## Описание

Состояние `processing` означает, что система активно выполняет действие.

## Когда используется

- Выполняется действие (action)
- Идет обработка данных
- LLM генерирует ответ

## Формат

### Server → Client API

```json
{
  "execute": {
    "ui": {
      "state": "processing",
      "message": "Выполняю действие...",
      "progress": 50
    }
  },
  "context": {
    "execution": {
      "action": "read-file",
      "step": "reading",
      "status": "processing"
    }
  }
}
```

### UI отображение

```json
{
  "execute": {
    "ui": {
      "state": "processing",
      "message": "Чтение файла...",
      "progress": 30,
      "spinner": true,
      "details": {
        "file": "src/auth.ts"
      }
    }
  }
}
```

## Типы processing

### 1. Выполнение action

```json
{
  "execute": {
    "read-file": {
      "path": "src/auth.ts"
    }
  },
  "context": {
    "execution": {
      "action": "read-file",
      "step": "read",
      "status": "processing"
    }
  }
}
```

### 2. LLM генерация

```json
{
  "execute": {
    "ui": {
      "state": "processing",
      "message": "AI генерирует ответ...",
      "spinner": true,
      "typing": true
    }
  }
}
```

### 3. Длительная операция

```json
{
  "execute": {
    "ui": {
      "state": "processing",
      "message": "Обработка файлов...",
      "progress": 45,
      "total": 100,
      "processed": 45
    }
  }
}
```

## Параметры UI

| Параметр | Тип | Описание |
|----------|-----|----------|
| `state` | string | Всегда "processing" |
| `message` | string | Сообщение о текущем действии |
| `progress` | number | Прогресс (0-100) |
| `spinner` | boolean | Показывать спиннер |
| `typing` | boolean | Индикатор "печатания" |
| `details` | object | Дополнительные детали |

## Client API поведение

### Отображение прогресса

```javascript
function handleProcessing(execute) {
  const { ui } = execute;
  
  // Обновляем UI
  updateUI({
    state: 'processing',
    message: ui.message,
    progress: ui.progress || 0,
    spinner: ui.spinner || true
  });
  
  // Если есть progress, показываем прогресс бар
  if (ui.progress !== undefined) {
    showProgressBar(ui.progress);
  }
}
```

## Примеры

### Пример 1: Чтение файла

**Server → Client API:**
```json
{
  "execute": {
    "read-file": {
      "path": "src/utils/helper.ts"
    }
  },
  "context": {
    "execution": {
      "action": "read-file",
      "step": "read",
      "status": "processing"
    }
  }
}
```

**Client API → Web UI:**
```json
{
  "execute": {
    "ui": {
      "state": "processing",
      "message": "Читаю файл: src/utils/helper.ts",
      "progress": 50,
      "spinner": true
    }
  }
}
```

### Пример 2: Выполнение команды

**Server → Client API:**
```json
{
  "execute": {
    "execute-command": {
      "command": "npm install"
    }
  },
  "context": {
    "execution": {
      "action": "execute-command",
      "step": "installing": "processing"
",
      "status    }
  }
}
```

**Client API → Web UI:**
```json
{
  "execute": {
    "ui": {
      "state": "processing",
      "message": "Выполняю: npm install",
      "spinner": true,
      "details": {
        "command": "npm install"
      }
    }
  }
}
```

## Таймауты

| Параметр | Значение | Описание |
|----------|----------|----------|
| Max processing time | 5 минут | Таймаут для одного action |
| Progress update | 1 сек | Минимальный интервал обновления |

## Связанные файлы

- [UI-COMMANDS.md](../../json-schemas/UI-COMMANDS.md)
- [Этап 3: Выполнение](../../STAGES/03-execution.md)

## Следующий шаг

После завершения processing:
- Успех → [Этап 4: Результат](../../STAGES/04-result.md)
- Ошибка → [error](error.md)
- Требуется ввод → [waiting](waiting.md)
