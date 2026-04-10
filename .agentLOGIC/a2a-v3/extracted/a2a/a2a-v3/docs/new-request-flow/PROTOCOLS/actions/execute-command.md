# Протокол действия: execute-command

## Описание

Действие `execute-command` используется для выполнения shell команд в изолированной среде (sandbox) проекта.

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
    "execute-command": {
      "command": "npm test",
      "cwd": ".",
      "timeout": 30000,
      "env": {
        "NODE_ENV": "test"
      },
      "shell": true
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `command` | string | ✅ | Команда для выполнения |
| `cwd` | string | ❌ | Рабочая директория (по умолчанию: корень проекта) |
| `timeout` | number | ❌ | Таймаут в миллисекундах (по умолчанию: 30000) |
| `env` | object | ❌ | Дополнительные переменные окружения |
| `shell` | boolean | ❌ | Выполнять через shell (по умолчанию: true) |
| `maxBuffer` | number | ❌ | Максимальный размер буфера вывода (по умолчанию: 1MB) |

## Формат result

### Client API → Server

```json
{
  "result": {
    "execute-command": {
      "command": "npm test",
      "exitCode": 0,
      "stdout": "Test Suites: 1 passed, 1 total\nTime: 2s",
      "stderr": "",
      "duration": 2150,
      "signal": null
    }
  }
}
```

### Параметры ответа

| Параметр | Тип | Описание |
|----------|-----|----------|
| `command` | string | Выполненная команда |
| `exitCode` | number | Код завершения (0 = успех) |
| `stdout` | string | Стандартный вывод |
| `stderr` | string | Стандартный вывод ошибок |
| `duration` | number | Время выполнения в мс |
| `signal` | string | Сигнал завершения (если был killed) |

## Примеры

### Пример 1: Успешное выполнение команды

**Server → Client API (execute):**
```json
{
  "execute": {
    "execute-command": {
      "command": "ls -la"
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "execute-command": {
      "command": "ls -la",
      "exitCode": 0,
      "stdout": "total 32\ndrwxr-xr-x  4 user  staff   128 Mar  9 10:00 .\ndrwxr-xr-x  1 user  staff   512 Mar  9 10:00 ..",
      "stderr": "",
      "duration": 45
    }
  }
}
```

### Пример 2: Ошибка выполнения

**Server → Client API (execute):**
```json
{
  "execute": {
    "execute-command": {
      "command": "npm run build",
      "timeout": 60000
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "execute-command": {
      "command": "npm run build",
      "exitCode": 1,
      "stdout": "",
      "stderr": "Error: Cannot find module 'webpack'\n    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:923:27)",
      "duration": 2340
    }
  }
}
```

### Пример 3: Таймаут

**Client API → Server (result):**
```json
{
  "result": {
    "execute-command": {
      "command": "sleep 100",
      "exitCode": null,
      "stdout": "",
      "stderr": "",
      "duration": 30000,
      "signal": "SIGTERM"
    }
  }
}
```

## Обработка ошибок

| Код/Сигнал | Сообщение | Описание |
|------------|-----------|----------|
| `exitCode > 0` | Команда завершилась с ошибкой | Ненулевой код завершения |
| `SIGTERM` | Таймаут | Команда превысила timeout |
| `SIGKILL` | Killed | Процесс был принудительно завершен |
| `COMMAND_NOT_FOUND` | Команда не найдена | Исполняемый файл не найден |
| `PERMISSION_DENIED` | Нет доступа | Нет прав на выполнение |
| `TIMEOUT` | Таймаут выполнения | Команда превысила максимальное время |

## Поток выполнения

```
1. Server формирует execute.execute-command
2. Client API получает запрос
3. Client API проверяет список разрешенных команд
4. Client API устанавливает таймер
5. Client API выполняет команду в sandbox
6. Client API собирает stdout/stderr
7. Client API возвращает result
8. Server получает result и переходит к следующему шагу
```

## Ограничения безопасности

- Белый список разрешенных команд
- Ограничение на выполняемые команды (только безопасные)
- Таймаут на выполнение
- Изоляция процессов
- Логирование всех выполненных команд
- Ограничение на размер вывода

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)

## Следующий шаг

После получения `result.execute-command` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
