# detect-test-framework

| Параметр | Значение |
|----------|----------|
| actionId | detect-test-framework |
| categoryId | testing |
| executorSystemId | script |
| title | Детекция test framework |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет какой test framework используется в проекте.

## Детектируемые фреймворки

### JavaScript/TypeScript
- Vitest
- Jest
- Mocha
- Ava
- Tape

### PHP
- PHPUnit
- Pest
- Codeception

### Python
- pytest
- unittest
- nose2

## Процесс детекции

1. Проверка package.json / composer.json
2. Поиск конфигурационных файлов
3. Анализ структуры тестов
4. Определение типа assertions

## Результат

- Название фреймворка
- Версия
- Конфигурационный файл
- Путь к тестам
