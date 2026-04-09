# Протокол действия: grep-search

## Описание

Действие `grep-search` используется для текстового поиска по файлам с использованием регулярных выражений или простого текста.

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
    "grep-search": {
      "pattern": "function\\s+\\w+",
      "path": "src",
      "options": {
        "regex": true,
        "caseSensitive": false,
        "wholeWord": false,
        "include": ["*.ts", "*.js"],
        "exclude": ["node_modules", "*.test.ts"]
      }
    }
  }
}
```

## Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `pattern` | string | ✅ | Поисковый паттерн |
| `path` | string | ❌ | Путь для поиска (по умолчанию: корень проекта) |
| `options.regex` | boolean | ❌ | Использовать регулярные выражения |
| `options.caseSensitive` | boolean | ❌ | Учитывать регистр |
| `options.wholeWord` | boolean | ❌ | Искать целые слова |
| `options.include` | string[] | ❌ | Файлы для включения |
| `options.exclude` | string[] | ❌ | Файлы для исключения |
| `options.maxResults` | number | ❌ | Максимум результатов |

## Формат result (план)

```json
{
  "result": {
    "grep-search": {
      "pattern": "function\\s+\\w+",
      "matches": [
        {
          "file": "src/auth.ts",
          "line": 10,
          "column": 5,
          "content": "function authenticateUser()",
          "match": "function authenticateUser"
        }
      ],
      "files": ["src/auth.ts", "src/user.ts"],
      "total": 15
    }
  }
}
```

## Примеры использования

### Пример 1: Поиск всех console.log

```json
{
  "execute": {
    "grep-search": {
      "pattern": "console\\.log",
      "path": "src",
      "options": {
        "include": ["*.ts", "*.js"]
      }
    }
  }
}
```

### Пример 2: Регулярное выражение

```json
{
  "execute": {
    "grep-search": {
      "pattern": "export (class|function|const|interface)",
      "path": "src",
      "options": {
        "regex": true,
        "caseSensitive": false
      }
    }
  }
}
```

## TODO

- [ ] Реализация поиска
- [ ] Поддержка больших файлов
- [ ] Асинхронный поиск для больших директорий
- [ ] Прогресс выполнения

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
