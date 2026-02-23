# detect-visual-regression

| Параметр | Значение |
|----------|----------|
| actionId | detect-visual-regression |
| categoryId | visual |
| executorSystemId | script |
| title | Детекция visual regression |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет наличие visual regression тестов в проекте.

## Детектируемые инструменты

### JavaScript/TypeScript
- Chromatic
- Percy
- BackstopJS
- Visual Regression Tracker
- Playwright visual tests
- Cypress Percy plugin

## Процесс

1. Поиск конфигурационных файлов
2. Анализ package.json
3. Проверка CI интеграций

## Результат

- Наличие visual testing
- Используемый инструмент
- Конфигурация
- Рекомендации
