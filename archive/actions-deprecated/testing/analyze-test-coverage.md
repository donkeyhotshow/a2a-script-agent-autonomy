# analyze-test-coverage

| Параметр | Значение |
|----------|----------|
| actionId | analyze-test-coverage |
| categoryId | testing |
| executorSystemId | script |
| title | Анализ покрытия тестов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт анализирует покрытие кода тестами.

## Инструменты

### JavaScript/TypeScript
- Vitest (built-in)
- Jest (--coverage)
- NYC
- Codecov

### PHP
- Xdebug
- PCOV
- PHPUnit --coverage-text

## Метрики

- Line coverage
- Function coverage
- Branch coverage
- Statement coverage

## Процесс

1. Запуск тестов с coverage
2. Анализ результатов
3. Генерация отчета
4. Визуализация данных

## Отчет

- Процент покрытия
- Файлы с низким покрытием
- Нек覆盖тые строки
- Рекомендации по улучшению

## Целевые показатели

- Minimum: 70%
- Good: 80%
- Excellent: 90%+
