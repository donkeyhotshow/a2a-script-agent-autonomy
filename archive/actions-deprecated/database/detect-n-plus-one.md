# detect-n-plus-one

| Параметр | Значение |
|----------|----------|
| actionId | detect-n-plus-one |
| categoryId | database |
| executorSystemId | script |
| title | Детекция N+1 queries |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование кода для обнаружения N+1 проблемы в запросах к БД.

## Что обнаруживается

### N+1 Pattern
```
php
// N+1: 1 запрос + N запросов
$users = User::all();
foreach ($users as $user) {
    echo $user->posts->count(); // каждый раз новый запрос
}
```

### Решения
- Eager loading
- Lazy loading (осознанно)
- Joins
- Subqueries

## Инструменты

- Laravel Debugbar
- ORM profilers
- Query Monitor
- New Relic
- Custom static analysis

## Best practices

- Использовать eager loading для отношений
- Использовать with() или load()
- Анализировать query logs
- Мониторить медленные запросы
