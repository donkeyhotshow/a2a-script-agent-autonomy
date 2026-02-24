# run-regression-tests

| Параметр | Значение |
|----------|----------|
| actionId | run-regression-tests |
| categoryId | testing |
| executorSystemId | script |
| title | Регрессионное тестирование |
| canMigrateToScript | ✅ |

## Описание

Автоматический запуск регрессионных тестов для проверки отсутствия новых багов после изменений.

## Типы регрессионных тестов

- Unit тесты
- Интеграционные тесты
- E2E тесты
- Snapshot тесты
- Visual regression тесты

## Инструменты

- PHPUnit
- Jest
- Vitest
- Cypress
- Playwright
- Chromatic
- Percy

## Процесс

### Pre-commit
- Локальный запуск тестов
- Быстрые unit тесты
- Линтинг

### CI/CD
- Полный набор тестов
- Интеграционные тесты
- E2E тесты

### Периодически
- Full regression suite
- Performance тесты
- Security скан

## Метрики

- Время выполнения
- Покрытие кода
- Количество failed тестов
- Flaky тесты
- Trend analysis

## Best practices

- Изоляция тестов
- Независимость от внешних сервисов
- Параллельное выполнение
- Кэширование
- Retry flaky тестов
- Clear test reports
