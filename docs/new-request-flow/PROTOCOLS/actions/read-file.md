# Протокол действия: read-file

## Описание

Действие `read-file` используется для чтения содержимого файла из файловой системы проекта.

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
    "read-file": {
      "path": "src/auth/user.ts",
      "encoding": "utf-8",
      "maxSize": 1048576
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `path` | string | ✅ | Относительный или абсолютный путь к файлу |
| `encoding` | string | ❌ | Кодировка файла (по умолчанию: utf-8) |
| `maxSize` | number | ❌ | Максимальный размер в байтах (по умолчанию: 1MB) |
| `lineNumbers` | boolean | ❌ | Добавить номера строк (по умолчанию: false) |
| `highlight` | object | ❌ | Подсветка определенных строк |

## Формат result

### Client API → Server

```json
{
  "result": {
    "read-file": {
      "path": "src/auth/user.ts",
      "exists": true,
      "size": 2048,
      "lines": 42,
      "content": "export class User {...}",
      "encoding": "utf-8"
    }
  }
}
```

### Параметры ответа

| Параметр | Тип | Описание |
|----------|-----|----------|
| `path` | string | Путь к прочитанному файлу |
| `exists` | boolean | Флаг существования файла |
| `size` | number | Размер файла в байтах |
| `lines` | number | Количество строк |
| `content` | string | Содержимое файла |
| `encoding` | string | Кодировка файла |

## Примеры

### Пример 1: Успешное чтение

**Server → Client API (execute):**
```json
{
  "execute": {
    "read-file": {
      "path": "package.json"
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "read-file": {
      "path": "package.json",
      "exists": true,
      "size": 1024,
      "lines": 28,
      "content": "{\n  \"name\": \"a2a-script-agent\",\n  \"version\": \"1.0.0\"\n}",
      "encoding": "utf-8"
    }
  }
}
```

### Пример 2: Файл не найден

**Client API → Server (result):**
```json
{
  "result": {
    "read-file": {
      "path": "src/nonexistent.ts",
      "exists": false,
      "error": "File not found"
    }
  }
}
```

### Пример 3: Чтение с подсветкой

**Server → Client API (execute):**
```json
{
  "execute": {
    "read-file": {
      "path": "src/auth.ts",
      "lineNumbers": true,
      "highlight": {
        "lines": [10, 11, 12],
        "color": "yellow"
      }
    }
  }
}
```

## Обработка ошибок

| Код ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `FILE_NOT_FOUND` | Файл не найден | Указанный путь не существует |
| `PERMISSION_DENIED` | Нет доступа | Нет прав на чтение файла |
| `FILE_TOO_LARGE` | Файл слишком большой | Превышен maxSize |
| `INVALID_PATH` | Некорректный путь | Путь содержит недопустимые символы |
| `READ_ERROR` | Ошибка чтения | Внутренняя ошибка при чтении |

## Поток выполнения

```
1. Server формирует execute.read-file
2. Client API получает запрос
3. Client API проверяет права доступа
4. Client API читает файл из файловой системы
5. Client API возвращает result с содержимым
6. Server получает result и переходит к следующему шагу
```

## Ограничения безопасности

- Доступ только к файлам внутри проекта
- Ограничение на размер читаемого файла
- Проверка пути на предмет directory traversal атак
- Логирование всех операций чтения

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
- [simulations/...](../../simulations/)

## Следующий шаг

После получения `result.read-file` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
