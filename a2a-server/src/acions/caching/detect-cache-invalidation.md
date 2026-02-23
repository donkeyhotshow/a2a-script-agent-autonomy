# detect-cache-invalidation

| Параметр | Значение |
|----------|----------|
| actionId | detect-cache-invalidation |
| categoryId | caching |
| executorSystemId | script |
| title | Детекция инвалидации кэша |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование для обнаружения проблем с инвалидацией кэша.

## Что обнаруживается

### Проблемы
- Cache Stampede
- Stale cache
- Missing invalidation
- Over-caching
- Improper TTL

### Анализ
- Когда данные обновляются
- Как кэш инвалидируется
- Время жизни ключей
- Зависимости между данными

## Типичные паттерны

### Cache-Aside
```
php
// При чтении
$value = Cache::get($key);
if (!$value) {
    $value = db_query();
    Cache::put($key, $value);
}
return $value;

// При записи - инвалидация
db_update();
Cache::forget($key);
```

### Проблемы
- Забытая инвалидация
- Неполная инвалидация
- Race conditions

## Решения

- Event-based invalidation
- Cache tags
- Versioning
- Write-through
- TTL with grace period

## Best practices

- Всегда инвалидировать при записи
- Использовать tags для групп
- Мониторить hit/miss ratio
- Логировать инвалидации
