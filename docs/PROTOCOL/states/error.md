# Протокол состояния: error

## Описание

Состояние `error` означает, что при выполнении произошла ошибка.

## Когда используется

- Ошибка валидации
- Ошибка выполнения action
- Ошибка AI/LLM
- Ошибка сети
- Таймаут

## Формат

### Server → Client API

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Файл не найден",
    "details": {
      "path": "src/nonexistent.ts"
    }
  },
  "context": {
    "execution": {
      "status": "error",
      "action": "read-file",
      "step": "read"
    }
  }
}
```

## Типы ошибок

### 1. Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибка валидации",
    "details": {
      "field": "email",
      "reason": "Неверный формат email"
    }
  }
}
```

### 2. File System Error

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Файл не найден",
    "details": {
      "path": "src/auth.ts"
    }
  }
}
```

### 3. Execution Error

```json
{
  "error": {
    "code": "EXECUTION_ERROR",
    "message": "Ошибка выполнения команды",
    "details": {
      "command": "npm run build",
      "exitCode": 1,
      "stderr": "Error: Cannot find module"
    }
  }
}
```

### 4. LLM Error

```json
{
  "error": {
    "code": "LLM_ERROR",
    "message": "Ошибка генерации ответа",
    "details": {
      "provider": "openai",
      "reason": "rate_limit"
    }
  }
}
```

### 5. Network Error

```json
{
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Ошибка сети",
    "details": {
      "status": 503,
      "reason": "Service Unavailable"
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
      "state": "error",
      "message": "Произошла ошибка",
      "error": {
        "code": "FILE_NOT_FOUND",
        "message": "Файл не найден",
        "details": {
          "path": "src/nonexistent.ts"
        }
      },
      "actions": [
        { "id": "retry", "label": "Повторить" },
        { "id": "cancel", "label": "Отмена" }
      ]
    }
  }
}
```

## Коды ошибок

| Код | Категория | Описание |
|-----|-----------|----------|
| `VALIDATION_ERROR` | Validation | Ошибка валидации |
| `FILE_NOT_FOUND` | File System | Файл не найден |
| `PERMISSION_DENIED` | File System | Нет доступа |
| `EXECUTION_ERROR` | Execution | Ошибка выполнения |
| `LLM_ERROR` | AI | Ошибка LLM |
| `NETWORK_ERROR` | Network | Ошибка сети |
| `TIMEOUT` | Timeout | Превышен таймаут |
| `RATE_LIMIT` | Rate Limit | Превышен лимит |
| `INTERNAL_ERROR` | Internal | Внутренняя ошибка |

## Client API поведение

### Обработка ошибки

```javascript
function handleError(error) {
  // Логируем ошибку
  logError(error);
  
  // Показываем UI
  showErrorUI({
    message: error.message,
    code: error.code,
    details: error.details,
    canRetry: isRetryable(error.code)
  });
  
  // Если ошибка не критична, предлагаем повторить
  if (isRetryable(error.code)) {
    showRetryButton();
  }
}
```

### Retry логика

```javascript
const RETRYABLE_ERRORS = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'RATE_LIMIT',
  'LLM_ERROR'
];

function isRetryable(errorCode) {
  return RETRYABLE_ERRORS.includes(errorCode);
}
```

## Примеры

### Пример 1: Ошибка чтения файла

**Server → Client API:**
```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Файл 'src/missing.ts' не найден",
    "details": {
      "path": "src/missing.ts"
    }
  }
}
```

**Client API → Web UI:**
```json
{
  "execute": {
    "ui": {
      "state": "error",
      "message": "❌ Файл не найден",
      "error": {
        "code": "FILE_NOT_FOUND",
        "message": "Файл 'src/missing.ts' не найден"
      },
      "actions": [
        { "id": "retry", "label": "Повторить" }
      ]
    }
  }
}
```

### Пример 2: Ошибка с деталями

**Server → Client API:**
```json
{
  "error": {
    "code": "EXECUTION_ERROR",
    "message": "Ошибка выполнения команды",
    "details": {
      "command": "npm install",
      "exitCode": 1,
      "stdout": "",
      "stderr": "npm ERR! code ENOENT\nnpm ERR! syscall open\nnpm ERR! path .../package.json"
    }
  }
}
```

## Таймауты

| Параметр | Значение | Описание |
|----------|----------|----------|
| Retry delay | 2 сек | Задержка перед повтором |
| Max retries | 3 | Максимум попыток |

## Связанные файлы

- [UI-COMMANDS.md](../../json-schemas/UI-COMMANDS.md)
- [Этап 5: Завершение](../../STAGES/05-completion.md)

## Следующий шаг

После ошибки:
- Пользователь может повторить (retry)
- Или отменить (cancel)
- Переход к [cancelled](cancelled.md) или завершению
