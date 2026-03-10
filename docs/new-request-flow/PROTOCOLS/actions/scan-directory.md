# Протокол действия: scan-directory

## Описание

Действие `scan-directory` используется для глубокого сканирования директорий по сложным критериям (glob паттерны, метаданные, структура проекта).

## Статус

🔶 **Частично реализовано** - требует доработки

## Направление

```
Server → Client API → File System (execute)
File System → Client API → Server (result)
```

## Формат execute (план)

```json
{
  "execute": {
    "scan-directory": {
      "path": "src",
      "pattern": "**/*.test.ts",
      "options": {
        "deep": true,
        "includeMetadata": true,
        "groupBy": "directory"
      }
    }
  }
}
```

## Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `path` | string | ✅ | Путь к директории |
| `pattern` | string | ❌ | Glob паттерн |
| `options.deep` | boolean | ❌ | Глубокое сканирование |
| `options.includeMetadata` | boolean | ❌ | Включить метаданные файлов |
| `options.groupBy` | string | ❌ | Группировка: "directory", "extension", "size" |

## Формат result (план)

```json
{
  "result": {
    "scan-directory": {
      "path": "src",
      "pattern": "**/*.test.ts",
      "entries": [
        {
          "path": "src/auth/auth.test.ts",
          "name": "auth.test.ts",
          "directory": "src/auth",
          "extension": ".test.ts",
          "size": 1024,
          "lines": 50,
          "modified": "2024-01-15T10:30:00Z"
        }
      ],
      "groups": {
        "src/auth": ["auth.test.ts"],
        "src/user": ["user.test.ts"]
      },
      "total": 25,
      "totalSize": 51200
    }
  }
}
```

## Примеры

### Пример 1: Поиск всех тестов

```json
{
  "execute": {
    "scan-directory": {
      "path": "src",
      "pattern": "**/*.test.ts"
    }
  }
}
```

### Пример 2: Группировка по директориям

```json
{
  "execute": {
    "scan-directory": {
      "path": "src",
      "pattern": "**/*.{ts,js}",
      "options": {
        "groupBy": "directory",
        "includeMetadata": true
      }
    }
  }
}
```

## TODO

- [ ] Полная реализация glob паттернов
- [ ] Группировка результатов
- [ ] Кэширование сканирования

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
