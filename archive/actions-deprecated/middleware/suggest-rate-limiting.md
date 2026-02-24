# suggest-rate-limiting

| Параметр | Значение |
|----------|----------|
| actionId | suggest-rate-limiting |
| categoryId | middleware |
| executorSystemId | agent |
| title | Предложение rate limiting |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует API и предлагает внедрение rate limiting для защиты от злоупотреблений.

## Типы Rate Limiting

### По пользователю
- Per-user limits
- Per-IP limits
- Per-token limits

### По типу
- Request rate (RPS)
- Daily limits
- Monthly quotas

### Алгоритмы
- Token Bucket
- Leaky Bucket
- Fixed Window
- Sliding Window

## Примеры конфигурации

### Nginx
```
nginx
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;
location /api/ {
    limit_req zone=mylimit burst=20 nodelay;
}
```

### Laravel
```php
Route::middleware(['throttle:60,1'])->group(function () {
    //
});
```

### Express + express-rate-limit
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});
app.use('/api/', limiter);
```

## Когда применять

- Public APIs
- Authentication endpoints
- Search functionality
- File downloads
- Payment operations
- Rate-sensitive operations

## Best practices

- Different limits for different endpoints
- Consider user tiers
- Include rate limit headers
- Graceful degradation
- Log and monitor
