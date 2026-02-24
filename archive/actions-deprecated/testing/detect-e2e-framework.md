# detect-e2e-framework

| Параметр | Значение |
|----------|----------|
| actionId | detect-e2e-framework |
| categoryId | testing |
| executorSystemId | script |
| title | Детекция E2E framework |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет какой E2E test framework используется в проекте.

## Детектируемые фреймворки

### JavaScript/TypeScript
- Playwright
- Cypress
- TestCafe
- Nightwatch
- WebdriverIO

### PHP
- Laravel Dusk
- Codeception

## Процесс детекции

1. Проверка package.json / composer.json
2. Поиск конфигурационных файлов
3. Анализ структуры тестов
4. Определение браузеров

## Результат

- Название фреймворка
- Версия
- Конфигурационный файл
- Путь к тестам
- Поддерживаемые браузеры
