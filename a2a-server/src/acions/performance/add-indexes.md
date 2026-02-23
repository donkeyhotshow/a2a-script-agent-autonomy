# add-indexes

| Параметр | Значение |
|----------|----------|
| actionId | add-indexes |
| categoryId | performance |
| executorSystemId | agent |
| title | Добавление индексов |
| canMigrateToScript | ⏳ |

## Описание

Агент анализирует запросы и добавляет индексы для оптимизации производительности БД.

## Типы индексов

### Single Column Index
```
sql
CREATE INDEX idx_users_email ON users(email);
```

### Composite Index
```
sql
CREATE INDEX idx_orders_user_status 
ON orders(user_id, status);
```

### Unique Index
```
sql
CREATE UNIQUE INDEX idx_users_email 
ON users(email);
```

### Partial Index
```
sql
CREATE INDEX idx_orders_active 
ON orders(created_at) 
WHERE status = 'active';
```

### Foreign Key Index
```
sql
CREATE INDEX idx_posts_user_id 
ON posts(user_id);
```

## Когда добавлять индексы

- WHERE clauses
- JOIN conditions
- ORDER BY
- GROUP BY
- DISTINCT
- Foreign keys
- Часто используемые фильтры

## Анализ запросов

### Slow Query Log
```
sql
-- Включить логирование
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

### EXPLAIN
```
sql
EXPLAIN ANALYZE 
SELECT * FROM orders WHERE user_id = 1;
```

### Index Usage
```
sql
SHOW INDEX FROM orders;
```

## Best practices

- Не индексировать всё подряд
- Учитывать селективность
- Порядок колонок в составных индексах
- Учитывать INSERT/UPDATE overhead
- Мониторить использование индексов
- Удалять неиспользуемые индексы

## Инструменты

- MySQL EXPLAIN
- PostgreSQL EXPLAIN
- Laravel Debugbar
- New Relic
- pt-index-usage
- SQL Server DMVs
