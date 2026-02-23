# suggest-query-optimization

| Параметр | Значение |
|----------|----------|
| actionId | suggest-query-optimization |
| categoryId | database |
| executorSystemId | agent |
| title | Предложение оптимизации запросов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует SQL запросы и предлагает методы их оптимизации.

## Типичные предложения

### Индексы
- Добавить индекс для WHERE clause
- Составные индексы для множественных условий
- Partial indexes для больших таблиц

### Запросы
- Избегать SELECT *
- Использовать LIMIT
- Оптимизировать JOIN
- Подзапросы vs JOIN
- Cursor pagination

### Структура
- Нормализация/денормализация
- Materialized views
- Partitioning

## Примеры

```
sql
-- Плохо
SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- Хорошо
SELECT id, status, total FROM orders WHERE created_at >= '2024-01-01';
```

```
php
// Laravel
// Плохо
User::whereYear('created_at', 2024)->get();

// Хорошо
User::whereBetween('created_at', ['2024-01-01', '2024-12-31'])->get();
```

## Инструменты анализа

- EXPLAIN
- Query profiler
- Slow query log
- Monitoring tools
