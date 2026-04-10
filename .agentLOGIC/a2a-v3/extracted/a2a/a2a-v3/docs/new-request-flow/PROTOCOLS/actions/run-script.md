# Протокол действия: run-script

## Описание

Действие `run-script` используется для запуска предопределенных скриптов из библиотеки скриптов проекта.

## Статус

❌ **Не реализовано** - запланировано

## Направление

```
Server → Client API → Script Runner (execute)
Script Runner → Client API → Server (result)
```

## Формат execute (план)

```json
{
  "execute": {
    "run-script": {
      "scriptId": "fix-vue-imports",
      "params": {
        "dryRun": false
      }
    }
  }
}
```

## Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `scriptId` | string | ✅ | ID скрипта из библиотеки |
| `params` | object | ❌ | Параметры для скрипта |
| `dryRun` | boolean | ❌ | Режим предпросмотра (без изменений) |

## Доступные скрипты

| scriptId | Описание | Параметры |
|----------|----------|-----------|
| `fix-vue-imports` | Исправить Vue импорты | `dryRun` |
| `phpunit-deprecations` | Анализ PHPUnit deprecations | `outputFormat` |
| `lint-fix` | Автоисправление линтера | `stagedOnly` |
| `format-code` | Форматирование кода | `extensions` |

## Формат result (план)

```json
{
  "result": {
    "run-script": {
      "scriptId": "fix-vue-imports",
      "success": true,
      "output": "Исправлено 5 файлов",
      "filesModified": [
        "src/components/Button.vue",
        "src/components/Input.vue"
      ],
      "duration": 3500
    }
  }
}
```

## Примеры

### Пример 1: Запуск скрипта

```json
{
  "execute": {
    "run-script": {
      "scriptId": "fix-vue-imports",
      "params": {
        "dryRun": true
      }
    }
  }
}
```

**Результат:**
```json
{
  "result": {
    "run-script": {
      "scriptId": "fix-vue-imports",
      "success": true,
      "output": "Будет исправлено 5 файлов",
      "filesModified": [],
      "dryRun": true,
      "duration": 1200
    }
  }
}
```

### Пример 2: Ошибка выполнения

```json
{
  "execute": {
    "run-script": {
      "scriptId": "nonexistent-script"
    }
  }
}
```

**Результат:**
```json
{
  "result": {
    "run-script": {
      "scriptId": "nonexistent-script",
      "success": false,
      "error": "SCRIPT_NOT_FOUND",
      "errorMessage": "Скрипт 'nonexistent-script' не найден"
    }
  }
}
```

## Поток выполнения

```
1. Server формирует execute.run-script
2. Client API проверяет существование скрипта
3. Client API проверяет права на запуск
4. Client API выполняет скрипт
5. Client API собирает результаты
6. Client API возвращает result
```

## Обработка ошибок

| Код ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `SCRIPT_NOT_FOUND` | Script not found | Скрипт не найден |
| `PERMISSION_DENIED` | Permission denied | Нет прав на запуск |
| `SCRIPT_ERROR` | Script error | Ошибка при выполнении скрипта |
| `TIMEOUT` | Script timeout | Таймаут выполнения |

## TODO

- [ ] Создание библиотеки скриптов
- [ ] API для регистрации скриптов
- [ ] Логирование выполнения

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
