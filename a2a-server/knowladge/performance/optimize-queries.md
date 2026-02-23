# optimize-queries

| Параметр | Значение |
|----------|----------|
| actionId | optimize-queries |
| categoryId | performance |
| executorSystemId | agent |
| title | Оптимизация запросов |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует SQL запросы и предлагает оптимизации для улучшения производительности.

## Типы оптимизации

### Index Optimization
- Добавление индексов
- Составные индексы
- Partial indexes
- Index on expressions

### Query Optimization
- Избегание SELECT *
- Использование LIMIT
- Оптимизация JOIN
- Подзапросы vs JOIN
- Batch operations

### Caching
- Query caching
- Result caching
- Redis caching
- Application level cache

## Примеры оптимизации

### До
```
sql
SELECT * FROM orders 
WHERE YEAR(created_at) = 2024 
AND MONTH(created_at) = 1;
```

### После
```
sql
SELECT id, status, total, created_at 
FROM orders 
WHERE created_at >= '2024-01-01' 
AND created_at < '2024-02-01';

-- Индекс: idx_orders_created_at
```

### Batch inserts
```
php
// До
foreach ($items as $item) {
    DB::table('items')->insert($item);
}

// После
DB::table('items')->insert($items);
```

## Инструменты

- EXPLAIN ANALYZE
- Laravel Debugbar
- New Relic
- Query Monitor
- MySQL Workbench
- pgAdmin

## Best practices

- Использовать индексы
- Избегать N+1 запросов
- Пагинация
- Кэширование
- Мониторинг медленных запросов
