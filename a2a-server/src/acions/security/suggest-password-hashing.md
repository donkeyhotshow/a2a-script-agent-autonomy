# suggest-password-hashing

| Параметр | Значение |
|----------|----------|
| actionId | suggest-password-hashing |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение хеширования паролей |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает безопасные методы хеширования паролей.

## Рекомендуемые алгоритмы

### 1. bcrypt
```
php
// PHP/Laravel
$hash = Hash::make('password');
Hash::check('password', $hash);
```

### 2. Argon2
```
javascript
// Node.js
const argon2 = require('argon2');
const hash = await argon2.hash(password);
```

### 3. scrypt
```
javascript
const crypto = require('crypto');
const hash = crypto.scryptSync(password, salt, 64);
```

## Best Practices

- Использовать соль
- Выбирать достаточную стоимость
- Не использовать MD5/SHA1
- Использовать slow hashes
- Проверять пароли без передачи по сети
