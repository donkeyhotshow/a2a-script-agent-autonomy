# Протокол действия: edit-patch

## Описание

Действие `edit-patch` используется для применения патчей к файлам (изменение конкретных строк, вставка, удаление).

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
    "edit-patch": {
      "path": "src/auth.ts",
      "operations": [
        {
          "type": "replace",
          "startLine": 10,
          "endLine": 15,
          "content": "new content here"
        }
      ],
      "backup": true
    }
  }
}
```

## Типы операций

| Тип | Описание |
|-----|----------|
| `replace` | Заменить строки |
| `insert` | Вставить строки |
| `delete` | Удалить строки |
| `replaceContent` | Заменить по содержимому |

## Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `path` | string | ✅ | Путь к файлу |
| `operations` | array | ✅ | Массив операций |
| `operations[].type` | string | ✅ | Тип операции |
| `operations[].startLine` | number | ❌ | Начальная строка |
| `operations[].endLine` | number | ❌ | Конечная строка |
| `operations[].content` | string | ❌ | Содержимое для вставки/замены |
| `operations[].search` | string | ❌ | Поиск по содержимому |
| `backup` | boolean | ❌ | Создать backup |

## Формат result (план)

```json
{
  "result": {
    "edit-patch": {
      "path": "src/auth.ts",
      "success": true,
      "operationsApplied": 2,
      "linesChanged": 10,
      "backupPath": "src/auth.ts.bak"
    }
  }
}
```

## Примеры

### Пример 1: Замена строк

```json
{
  "execute": {
    "edit-patch": {
      "path": "src/config.ts",
      "operations": [
        {
          "type": "replace",
          "startLine": 5,
          "endLine": 10,
          "content": "export const CONFIG = {\n  debug: true\n};"
        }
      ]
    }
  }
}
```

### Пример 2: Вставка строк

```json
{
  "execute": {
    "edit-patch": {
      "path": "src/index.ts",
      "operations": [
        {
          "type": "insert",
          "startLine": 1,
          "content": "import { init } from './init';\n"
        }
      ]
    }
  }
}
```

### Пример 3: Замена по содержимому

```json
{
  "execute": {
    "edit-patch": {
      "path": "src/auth.ts",
      "operations": [
        {
          "type": "replaceContent",
          "search": "const API_URL = 'http://localhost:3000'",
          "content": "const API_URL = process.env.API_URL || 'http://localhost:3000'"
        }
      ]
    }
  }
}
```

## TODO

- [ ] Реализация базового редактирования
- [ ] Поддержка Undo/Redo
- [ ] Backup файлов
- [ ] Валидация изменений

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
