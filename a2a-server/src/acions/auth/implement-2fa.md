# implement-2fa

| Параметр | Значение |
|----------|----------|
| actionId | implement-2fa |
| categoryId | auth |
| executorSystemId | agent |
| title | Реализация 2FA |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент реализует двухфакторную аутентификацию для повышения безопасности.

## Методы 2FA

### TOTP (Time-based)
- Google Authenticator
- Authy
- Microsoft Authenticator

### SMS
- Код по SMS
- Менее безопасно

### Email
- Код по email
- Backup метод

### Hardware
- YubiKey
- RSA SecurID

## Реализация TOTP

### Laravel
```
php
// Установка: pragmarx/google2fa-laravel
// Мидлвар
$this->middleware(function ($request, $next) {
    if (auth()->user()->google2fa_secret) {
        if (!$request->session()->get('2fa_verified')) {
            return redirect('/2fa');
        }
    }
    return $next($request);
});

// Проверка
$secret = $request->input('secret');
$valid = Google2FA::verifyKey($user->google2fa_secret, $secret);
```

### Node.js
```
javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Генерация секрета
const secret = speakeasy.generateSecret({
  name: 'MyApp (user@example.com)',
  issuer: 'MyApp'
});

// Верификация
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userToken,
  window: 1
});
```

## Best practices

- Предлагать 2FA при регистрации
- Backup codes
- Recovery options
- Force для админов
- Необязательно для обычных пользователей
- Информировать пользователей

## Инструменты

- Google Authenticator
- Authy
- bcrypt для хранения
- Laravel 2FA
- Node.js speakeasy
