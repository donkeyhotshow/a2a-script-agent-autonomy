# suggest-csrf-protection

| Параметр | Значение |
|----------|----------|
| actionId | suggest-csrf-protection |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение CSRF защиты |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает методы защиты от CSRF (Cross-Site Request Forgery) для приложения.

## Методы защиты

### 1. CSRF Tokens
```
php
// Laravel
@csrf
<input type="hidden" name="_token" value="{{ csrf_token() }}">
```

### 2. SameSite Cookies
```
php
// Cookie с SameSite атрибутом
cookie()->withSameSiteNone()->withSecure();
```

### 3. Double Submit Cookie
```
javascript
// Frontend
const csrfToken = getCookie('CSRF-TOKEN');
fetch('/api', {
  headers: {
    'X-CSRF-TOKEN': csrfToken
  }
})
```

## Рекомендации

- Использовать синхронные токены
- Валидировать на сервере
- Использовать SameSite cookies
- Проверять Referer заголовки
- Использовать фреймворки с встроенной защитой
