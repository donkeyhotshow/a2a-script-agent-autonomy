# detect-csrf

| Параметр | Значение |
|----------|----------|
| actionId | detect-csrf |
| categoryId | security |
| executorSystemId | script |
| title | Детекция CSRF |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет отсутствие защиты от CSRF (Cross-Site Request Forgery) в приложении.

## Детекция

### Проверки
- Наличие CSRF токенов
- Middleware защиты
- Проверка Referer/Origin заголовков
- SameSite cookies

### Файлы для сканирования
- Laravel: middleware, controllers
- Express: routes, middleware
- Frontend: forms, AJAX requests

## Результат

- Список endpoints без CSRF защиты
- Отсутствующие middleware
- Рекомендации по исправлению

## Примеры

### Laravel
```
php
// Защищенный маршрут
Route::post('/update', [Controller::class, 'update'])
    ->middleware('csrf');
```

### Blade
```
blade
<form method="POST">
    @csrf
    ...
</form>
