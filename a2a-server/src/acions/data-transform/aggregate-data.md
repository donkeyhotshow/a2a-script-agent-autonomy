# aggregate-data

| Параметр | Значение |
|----------|----------|
| actionId | aggregate-data |
| categoryId | data-transform |
| executorSystemId | script |
| title | Агрегация данных |
| canMigrateToScript | ✅ |

## Описание

Автоматическая агрегация данных из различных источников для создания отчетов и аналитики.

## Типы агрегации

### Database Aggregation
- COUNT, SUM, AVG, MIN, MAX
- GROUP BY
- HAVING
- Window functions
- Rollup/Cube

### Application Level
- In-memory aggregation
- Streaming aggregation
- Real-time aggregation
- Scheduled aggregation

## Примеры

### SQL Aggregation
```
sql
-- Ежедневные продажи
SELECT 
    DATE(created_at) as date,
    COUNT(*) as orders,
    SUM(total) as revenue,
    AVG(total) as avg_order
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Laravel Aggregation
```
php
// Агрегация заказов по статусу
$stats = Order::select('status')
    ->selectRaw('COUNT(*) as count')
    ->selectRaw('SUM(total) as revenue')
    ->groupBy('status')
    ->get();

// Агрегация по периодам
$sales = Order::whereYear('created_at', 2024)
    ->groupByRaw('YEAR(created_at), MONTH(created_at)')
    ->selectRaw('MONTH(created_at) as month')
    ->selectRaw('SUM(total) as total')
    ->get();
```

### JavaScript Aggregation
```
javascript
// Агрегация на клиенте
const stats = orders.reduce((acc, order) => {
  acc.count++;
  acc.total += order.total;
  return acc;
}, { count: 0, total: 0 });
```

## Use Cases

- Daily/weekly/monthly отчеты
- Analytics dashboards
- Data warehousing
- Real-time metrics
- User activity tracking

## Инструменты

- SQL (GROUP BY, window functions)
- Laravel Collections
- Pandas (Python)
- Apache Spark
- Elasticsearch aggregations
- Redis (sorted sets)

## Best practices

- Агрегация на уровне БД когда возможно
- Кэширование результатов
- Инкрементальное обновление
- Асинхронная обработка
- Мониторинг производительности
