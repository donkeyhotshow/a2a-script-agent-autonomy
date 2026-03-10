# Протокол действия: script

## Описание

Действие `script` используется для выполнения JavaScript кода в изолированной среде (sandbox) на стороне клиента.

## Направление

```
Server → Client API → Web UI (execute)
Web UI → Client API → Server (result)
```

## Формат execute

### Server → Client API

```json
{
  "execute": {
    "script": {
      "code": "return Math.sum([1, 2, 3]);",
      "language": "javascript",
      "timeout": 5000,
      "context": {
        "input": {
          "numbers": [1, 2, 3]
        }
      }
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `code` | string | ✅ | JavaScript код для выполнения |
| `language` | string | ❌ | Язык (javascript, typescript) |
| `timeout` | number | ❌ | Таймаут в мс (по умолчанию: 5000) |
| `context` | object | ❌ | Контекст выполнения с входными данными |
| `sandbox` | object | ❌ | Настройки sandbox |

## Формат result

### Client API → Server

```json
{
  "result": {
    "script": {
      "output": 6,
      "logs": ["Результат: 6"],
      "error": null,
      "duration": 12
    }
  }
}
```

### Параметры ответа

| Параметр | Тип | Описание |
|----------|-----|----------|
| `output` | any | Результат выполнения скрипта |
| `logs` | string[] | Логи выполнения |
| `error` | string | Сообщение об ошибке (если есть) |
| `duration` | number | Время выполнения в мс |

## Примеры

### Пример 1: Простое вычисление

**Server → Client API (execute):**
```json
{
  "execute": {
    "script": {
      "code": "const sum = (a, b) => a + b; return sum(5, 3);"
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "script": {
      "output": 8,
      "logs": [],
      "error": null,
      "duration": 2
    }
  }
}
```

### Пример 2: Работа с контекстом

**Server → Client API (execute):**
```json
{
  "execute": {
    "script": {
      "code": "const files = input.files; return files.map(f => f.name);",
      "context": {
        "input": {
          "files": ["auth.js", "user.ts", "config.json"]
        }
      }
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "script": {
      "output": ["auth.js", "user.ts", "config.json"],
      "logs": [],
      "error": null,
      "duration": 1
    }
  }
}
```

### Пример 3: Ошибка выполнения

**Server → Client API (execute):**
```json
{
  "execute": {
    "script": {
      "code": "throw new Error('Test error');"
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "script": {
      "output": null,
      "logs": [],
      "error": "Error: Test error",
      "duration": 1
    }
  }
}
```

## API Available в Sandbox

### Встроенные функции

```javascript
// Математические функции
Math.sum(arr)        // Сумма массива
Math.max(arr)        // Максимум массива
Math.min(arr)        // Минимум массива
Math.avg(arr)        // Среднее значение

// Работа с файлами (browser API)
input.files           // Массив входных файлов
output.text(text)     // Вывод текста
output.json(obj)      // Вывод JSON

// Утилиты
console.log(msg)      // Логирование
utils.format(fmt, ...args) // Форматирование
```

## Обработка ошибок

| Тип ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `SYNTAX_ERROR` | Syntax Error | Ошибка синтаксиса JavaScript |
| `RUNTIME_ERROR` | Runtime Error | Ошибка времени выполнения |
| `TIMEOUT` | Script Timeout | Превышен таймаут выполнения |
| `MEMORY_LIMIT` | Memory Limit | Превышен лимит памяти |
| `PERMISSION_DENIED` | Permission Denied | Запрещенная операция |

## Поток выполнения

```
1. Server формирует execute.script
2. Client API получает запрос
3. Client API валидирует код
4. Client API создает sandbox environment
5. Client API выполняет код с указанным контекстом
6. Client API собирает output и logs
7. Client API возвращает result
8. Server получает result и переходит к следующему шагу
```

## Ограничения безопасности

- Выполнение в изолированном sandbox
- Нет доступа к filesystem напрямую
- Нет доступа к network
- Ограничение на размер кода
- Таймаут выполнения
- Логирование всех выполнений

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)

## Следующий шаг

После получения `result.script` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
