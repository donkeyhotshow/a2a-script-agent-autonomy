# suggest-strong-crypto

| Параметр | Значение |
|----------|----------|
| actionId | suggest-strong-crypto |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение сильной криптографии |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использование сильных криптографических алгоритмов.

## Рекомендуемые алгоритмы

### Хеширование
- bcrypt
- scrypt
- Argon2
- PBKDF2

### Шифрование
- AES-256-GCM
- ChaCha20-Poly1305

### Hash функции
- SHA-256
- SHA-3

### TLS
- TLS 1.3
- TLS 1.2 (минимально)

## Примеры

### Хеширование пароля
```
php
// PHP/Laravel
$hash = Hash::make('password', [
    'rounds' => 12,
]);
```

### Шифрование
```
javascript
// Node.js
const crypto = require('crypto');
const key = crypto.scryptSync(password, 'salt', 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Best Practices

- Использовать соль
- Выбирать правильное количество раундов
- Использовать IV один раз
- Использовать authenticated encryption
