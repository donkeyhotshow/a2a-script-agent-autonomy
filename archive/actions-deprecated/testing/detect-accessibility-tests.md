# detect-accessibility-tests

| Параметр | Значение |
|----------|----------|
| actionId | detect-accessibility-tests |
| categoryId | a11y |
| executorSystemId | script |
| title | Детекция accessibility тестов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет наличие accessibility (a11y) тестов в проекте.

## Детектируемые инструменты

### JavaScript/TypeScript
- axe-core
- jest-axe
- @axe-core/playwright
- @axe-core/react
- pa11y
- Lighthouse

### Тесты
- Automated a11y tests
- ARIA validation
- Color contrast checks
- Keyboard navigation tests

## Процесс

1. Поиск a11y-related пакетов
2. Анализ тестовых файлов
3. Проверка CI интеграций

## Результат

- Наличие a11y тестов
- Используемые инструменты
- Покрытие компонентов
- Рекомендации
