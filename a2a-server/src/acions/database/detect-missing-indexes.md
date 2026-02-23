# detect-missing-indexes

| Параметр | Значение |
|----------|----------|
| actionId | detect-missing-indexes |
| categoryId | database |
| executorSystemId | script |
| title | Детекция отсутствующих индексов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование запросов для определения отсутствующих индексов.

## Методы обнаружения

### Query Analysis
- Анализ WHERE clauses
- JOIN conditions
- ORDER BY
- GROUP BY

### Slow Query Log
- Запросы > порога
- Частота выполнения
- Время выполнения

### EXPLAIN Analysis
- Full table scans
- Filesort
- Temporary tables

## Типичные проблемы

```
sql
-- Slow: Full table scan
SELECT * FROM orders WHERE status = 'pending';

-- Fast: With index
CREATE INDEX idx_orders_status ON orders(status);
```

## Инструменты

- MySQL EXPLAIN
- PostgreSQL EXPLAIN
- SQL Server Execution Plan
- Query analyzers
- Monitoring tools (New Relic, Datadog)

## Best practices

- Регулярный анализ slow query log
- Тестировать на production данных
- Учитывать cardinality
- Мониторить после добавления индексов
