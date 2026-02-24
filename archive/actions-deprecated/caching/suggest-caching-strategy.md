# suggest-caching-strategy

| Параметр | Значение |
|----------|----------|
| actionId | suggest-caching-strategy |
| categoryId | caching |
| executorSystemId | agent |
| title | Предложение стратегии кэширования |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует приложение и предлагает оптимальную стратегию кэширования.

## Типы кэширования

### Page Caching
- Full page cache
- Partial page cache
- HTTP caching

### Data Caching
- Query caching
- Object caching
- API response caching

### Application Caches
- Application-level
- Distributed (Redis, Memcached)
- CDN

## Стратегии

### Cache-Aside
```
1. Проверить cache
2. Если нет - запросить данные
3. Сохранить в cache
4. Вернуть данные
```

### Write-Through
```
1. Записать в БД
2. Записать в cache
```

### Write-Behind
```
1. Записать в БД async
2. Записать в cache
```

## Примеры предложений

1. "Используйте Redis для сессий"
2. "Кэшируйте результаты дорогих запросов"
3. "Добавьте HTTP cache headers"
4. "Примените tag-based cache для связанных данных"

## Инструменты

- Redis
- Memcached
- Varnish
- Nginx
- CDN
- Laravel Cache
