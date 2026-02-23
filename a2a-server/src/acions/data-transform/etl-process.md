# etl-process

| Параметр | Значение |
|----------|----------|
| actionId | etl-process |
| categoryId | data-transform |
| executorSystemId | script |
| title | ETL процессы |
| canMigrateToScript | ✅ |

## Описание

Автоматическое извлечение (Extract), трансформация (Transform) и загрузка (Load) данных между системами.

## Этапы ETL

### Extract (Извлечение)
- Чтение из источников
- Полный vs инкрементальный сбор
- API интеграции
- Database connections
- File reading

### Transform (Трансформация)
- Data cleansing
- Data normalization
- Type conversion
- Data enrichment
- Aggregations
- Business rules application

### Load (Загрузка)
- Bulk insert
- Upsert operations
- Incremental loads
- Error handling
- Data validation

## Примеры

### Simple ETL Pipeline
```
python
# Extract
df_source = read_from_database('source_db', query)

# Transform
df_transformed = df_source.apply(transformations)

# Load
write_to_database('target_db', df_transformed)
```

### Laravel ETL
```
php
// Extract
$orders = DB::table('orders')->get();

// Transform
$report = $orders->groupBy('status')
    ->map(fn ($group) => [
        'status' => $group->first()->status,
        'count' => $group->count(),
        'total' => $group->sum('total')
    ]);

DB::table('reports')->upsert($report->toArray(), 'status');
```

## Инструменты

- Apache Airflow
- Luigi
- Talend
- Apache NiFi
- AWS Glue
- Laravel jobs
- Python (Pandas)

## Best practices

- Инкрементальная загрузка
- Обработка ошибок
- Логирование
- Мониторинг
- Idempotency
- Data validation
- Backpressure handling
