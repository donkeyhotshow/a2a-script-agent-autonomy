# Протокол действия: file-exists

## Описание

Действие `file-exists` используется для проверки существования файла или директории.

## Статус

❌ **Не реализовано** - запланировано

## Направление

```
Server → Client API → File System (execute)
File System → Client API → Server (result)
```

## Формат execute (план)

```json
{
  "execute": {
    "file-exists": {
      "path": "src/auth.ts"
    }
  }
}
```

## Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `path` | string | ✅ | Путь к файлу или директории |
| `type` | string | ❌ | Тип: "file", "directory", или "any" |

## Формат result (план)

```json
{
  "result": {
    "file-exists": {
      "path": "src/auth.ts",
      "exists": true,
      "type": "file",
      "size": 2048,
      "modified": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Примеры

### Пример 1: Проверка существования файла

```json
{
  "execute": {
    "file-exists": {
      "path": "package.json"
    }
  }
}
```

**Результат:**
```json
{
  "result": {
    "file-exists": {
      "path": "package.json",
      "exists": true,
      "type": "file",
      "size": 1024,
      "modified": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Пример 2: Файл не существует

```json
{
  "execute": {
    "file-exists": {
      "path": "src/nonexistent.ts"
    }
  }
}
```

**Результат:**
```json
{
  "result": {
    "file-exists": {
      "path": "src/nonexistent.ts",
      "exists": false
    }
  }
}
```

### Пример 3: Проверка директории

```json
{
  "execute": {
    "file-exists": {
      "path": "src",
      "type": "directory"
    }
  }
}
```

**Результат:**
```json
{
  "result": {
    "file-exists": {
      "path": "src",
      "exists": true,
      "type": "directory",
      "modified": "2024-01-15T10:30:00Z"
    }
  }
}
```

## TODO

- [ ] Базовая реализация проверки
- [ ] Поддержка директорий
- [ ] Кэширование результатов

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
