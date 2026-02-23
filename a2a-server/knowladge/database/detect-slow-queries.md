# detect-slow-queries

| Параметр | Значение |
|----------|----------|
| actionId | detect-slow-queries |
| categoryId | database |
| executorSystemId | script |
| title | Детекция медленных запросов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование и мониторинг медленных SQL запросов в приложении.

## Что обнаруживается

### Признаки медленных запросов
- Full table scans
- Missing indexes
- Large result sets
- Complex JOINs
- Subqueries в циклах
- Неэффективные агрегации

### Метрики
- Время выполнения
- Количество строк
- Использование CPU
- I/O операции

## Инструменты

### Database-native
- MySQL Slow Query Log
- PostgreSQL pg_stat_statements
- SQL Server Extended Events

### APM Tools
- New Relic
- Datadog
- APM
- Laravel Debugbar
- Scout

## Пороговые значения

- MySQL: long_query_time = 2s
- PostgreSQL: log_min_duration_statement
- Custom: Зависит от приложения

## Best practices

- Включить slow query log
- Регулярно анализировать
- Настроить alerts
- ОптимизироватьTop queries
- Добавить индексы
