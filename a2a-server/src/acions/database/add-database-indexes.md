# add-database-indexes

| Параметр | Значение |
|----------|----------|
| actionId | add-database-indexes |
| categoryId | database |
| executorSystemId | agent |
| title | Добавление индексов |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент добавляет индексы в базу данных для оптимизации производительности запросов.

## Типы индексов

### Single Column
```
sql
CREATE INDEX idx_users_email ON users(email);
```

### Composite
```
sql
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
```

### Unique
```
sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

## Когда добавлять

- WHERE clauses
- JOIN conditions
- ORDER BY
- GROUP BY
- Foreign keys
- Часто используемые фильтры

## Примеры

```
php
// Laravel
Schema::table('orders', function (Blueprint $table) {
    $table->index(['status', 'created_at']);
});
```

## Best practices

- Анализировать EXPLAIN
- Не индексировать всё подряд
- Учитывать INSERT overhead
- Мониторить использование

## Инструменты

- MySQL
- PostgreSQL
- SQLite
- SQL Server
