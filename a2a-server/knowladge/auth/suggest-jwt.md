# suggest-jwt

| Параметр | Значение |
|----------|----------|
| actionId | suggest-jwt |
| categoryId | auth |
| executorSystemId | agent |
| title | Предложение JWT |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует приложение и предлагает использование JWT для аутентификации.

## Что такое JWT

### Структура
```
header.payload.signature
```

### Пример
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## Когда рекомендовать

### Преимущества
- Stateless
- Scalable
- Cross-domain
- Mobile-friendly
- No session storage

### Недостатки
- No server-side logout
- Larger token size
- Security considerations

## Примеры реализации

### Laravel + JWT
```
php
// Установка: tymon/jwt-auth
$token = auth('api')->login($user);
return response()->json(['token' => $token]);
```

### Node.js + JWT
```
javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '1h' });
```

## Best practices

- Short expiration times
- HTTPS only
- Store in httpOnly cookies
- Implement refresh tokens
- Validate all claims
- Blacklist for logout
