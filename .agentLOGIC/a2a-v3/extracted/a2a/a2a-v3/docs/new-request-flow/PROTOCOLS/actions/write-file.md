# Протокол действия: write-file

## Описание

Действие `write-file` используется для записи или создания файлов в файловой системе проекта.

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
    "write-file": {
      "path": "src/new-file.ts",
      "content": "export function hello() {...}",
      "encoding": "utf-8",
      "createDirs": true,
      "overwrite": false
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `path` | string | ✅ | Относительный путь к файлу |
| `content` | string | ✅ | Содержимое для записи |
| `encoding` | string | ❌ | Кодировка (по умолчанию: utf-8) |
| `createDirs` | boolean | ❌ | Создавать промежуточные директории (по умолчанию: true) |
| `overwrite` | boolean | ❌ | Перезаписывать существующий файл (по умолчанию: false) |
| `append` | boolean | ❌ | Дописывать в конец файла (по умолчанию: false) |

## Формат result

### Client API → Server

```json
{
  "result": {
    "write-file": {
      "path": "src/new-file.ts",
      "success": true,
      "bytesWritten": 2048,
      "linesWritten": 42,
      "created": true
    }
  }
}
```

### Параметры ответа

| Параметр | Тип | Описание |
|----------|-----|----------|
| `path` | string | Путь к записанному файлу |
| `success` | boolean | Флаг успешной записи |
| `bytesWritten` | number | Количество записанных байт |
| `linesWritten` | number | Количество записанных строк |
| `created` | boolean | Флаг создания нового файла |
| `overwritten` | boolean | Флаг перезаписи существующего файла |

## Примеры

### Пример 1: Создание нового файла

**Server → Client API (execute):**
```json
{
  "execute": {
    "write-file": {
      "path": "src/utils/helpers.ts",
      "content": "export function formatDate(date: Date): string {\n  return date.toISOString();\n}"
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "write-file": {
      "path": "src/utils/helpers.ts",
      "success": true,
      "bytesWritten": 86,
      "linesWritten": 2,
      "created": true
    }
  }
}
```

### Пример 2: Перезапись файла

**Server → Client API (execute):**
```json
{
  "execute": {
    "write-file": {
      "path": "src/config.json",
      "content": "{\"debug\": true}",
      "overwrite": true
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "write-file": {
      "path": "src/config.json",
      "success": true,
      "bytesWritten": 16,
      "linesWritten": 1,
      "created": false,
      "overwritten": true
    }
  }
}
```

### Пример 3: Ошибка - файл существует

**Client API → Server (result):**
```json
{
  "result": {
    "write-file": {
      "path": "src/existing.ts",
      "success": false,
      "error": "FILE_EXISTS",
      "errorMessage": "Файл уже существует. Используйте overwrite: true для перезаписи"
    }
  }
}
```

## Обработка ошибок

| Код ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `FILE_EXISTS` | Файл уже существует | Файл существует, overwrite=false |
| `PERMISSION_DENIED` | Нет доступа | Нет прав на запись |
| `DIRECTORY_NOT_FOUND` | Директория не найдена | Родительская директория не существует |
| `INVALID_PATH` | Некорректный путь | Путь содержит недопустимые символы |
| `WRITE_ERROR` | Ошибка записи | Внутренняя ошибка при записи |
| `DISK_FULL` | Диск переполнен | Недостаточно места на диске |

## Поток выполнения

```
1. Server формирует execute.write-file
2. Client API получает запрос
3. Client API проверяет существование файла
4. Client API проверяет права доступа
5. Client API создает директории если нужно
6. Client API записывает файл
7. Client API возвращает result с информацией о записи
8. Server получает result и переходит к следующему шагу
```

## Ограничения безопасности

- Запись только внутри проекта
- Проверка пути на directory traversal
- Резервное копирование перед перезаписью (опционально)
- Логирование всех операций записи
- Ограничение на максимальный размер файла

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)

## Следующий шаг

После получения `result.write-file` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
