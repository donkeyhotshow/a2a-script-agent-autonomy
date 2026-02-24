# configure-security-headers

| Параметр | Значение |
|----------|----------|
| actionId | configure-security-headers |
| categoryId | security |
| executorSystemId | agent |
| title | Настройка заголовков безопасности |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент настраивает HTTP security headers для приложения.

## Основные заголовки

### 1. Content-Security-Policy
```
Content-Security-Policy: default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
```

### 2. X-Frame-Options
```
X-Frame-Options: DENY
```

### 3. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```

### 4. Strict-Transport-Security
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 5. X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```

### 6. Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. Permissions-Policy
```
Permissions-Policy: geolocation=(), microphone=()
```

## Реализация

### Laravel/Middleware
```
php
class SecurityHeadersMiddleware
{
    public function handle($request, Closure $next)
    {
        $response = $next($request);
        
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        
        return $response;
    }
}
```

## Рекомендации

- Тестировать на staging
- Использовать CSP для разработки
- Настроить Report-URI
- Регулярно аудировать
- Обновлять политики
