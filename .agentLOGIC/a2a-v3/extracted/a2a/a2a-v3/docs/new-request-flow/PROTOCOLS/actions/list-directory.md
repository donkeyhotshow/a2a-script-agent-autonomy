# Протокол действия: list-directory

## Описание

Действие `list-directory` используется для получения списка файлов и директорий в указанной папке.

## Статус

🔶 **Частично реализовано** - требует доработки

## Направление

```
Server → Client API → File System (execute)
File System → Client API → Server (result)
```

## Формат execute

### Server → Client API

```json
{
  "execute": {
    "list-directory": {
      "path": "src",
      "recursive": false,
      "filter": {
        "extensions": [".ts", ".js"]
      }
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `path` | string | ✅ | Путь к директории |
| `recursive` | boolean | ❌ | Рекурсивный обход (по умолчанию: false) |
| `filter` | object | ❌ | Фильтр файлов |
| `filter.extensions` | string[] | ❌ | Расширения файлов |
| `filter.pattern` | string | ❌ | Glob паттерн |
| `maxDepth` | number | ❌ | Максимальная глубина |
| `includeHidden` | boolean | ❌ | Включить скрытые файлы |

## Формат result

### Client API → Server

```json
{
  "result": {
    "list-directory": {
      "path": "src",
      "entries": [
        {
          "name": "utils",
          "type": "directory",
          "path": "src/utils"
        },
        {
          "name": "auth.ts",
          "type": "file",
          "path": "src/auth.ts",
          "size": 2048,
          "extension": ".ts"
        }
      ],
      "total": 15,
      "directories": 5,
      "files": 10
    }
  }
}
```

## Примеры

### Пример 1: Простой список файлов

**Server → Client API (execute):**
```json
{
  "execute": {
    "list-directory": {
      "path": "src"
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "list-directory": {
      "path": "src",
      "entries": [
        { "name": "index.ts", "type": "file", "path": "src/index.ts" },
        { "name": "utils", "type": "directory", "path": "src/utils" },
        { "name": "components", "type": "directory", "path": "src/components" }
      ],
      "total": 3,
      "directories": 2,
      "files": 1
    }
  }
}
```

### Пример 2: Рекурсивный с фильтром

**Server → Client API (execute):**
```json
{
  "execute": {
    "list-directory": {
      "path": "src",
      "recursive": true,
      "filter": {
        "extensions": [".ts", ".tsx"]
      },
      "maxDepth": 3
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "list-directory": {
      "path": "src",
      "entries": [
        { "name": "index.ts", "type": "file", "path": "src/index.ts" },
        { "name": "auth", "type": "directory", "path": "src/auth" },
        { "name": "user.ts", "type": "file", "path": "src/auth/user.ts" }
      ],
      "total": 25,
      "directories": 8,
      "files": 17
    }
  }
}
```

## Обработка ошибок

| Код ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `DIRECTORY_NOT_FOUND` | Directory not found | Директория не существует |
| `PERMISSION_DENIED` | Permission denied | Нет доступа |
| `MAX_DEPTH_EXCEEDED` | Max depth exceeded | Превышена глубина |

## Поток выполнения

```
1. Server формирует execute.list-directory
2. Client API получает запрос
3. Client API проверяет права доступа
4. Client API читает директорию
5. Client API применяет фильтры
6. Client API возвращает result
7. Server получает result
```

## Ограничения

- Максимальная глубина: 10
- Максимальное количество файлов: 1000
- Фильтрация по расширениям и паттернам

## TODO

- [ ] Полная реализация фильтрации
- [ ] Поддержка сортировки
- [ ] Кэширование результатов

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)

## Следующий шаг

После получения `result.list-directory` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
