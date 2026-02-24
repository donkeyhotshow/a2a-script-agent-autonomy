# suggest-session-hardening

| Параметр | Значение |
|----------|----------|
| actionId | suggest-session-hardening |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение укрепления сессий |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает методы усиления безопасности сессий.

## Методы укрепления

### 1. Безопасные cookies
```
php
// Laravel
cookie()->forever('session', $value)
    ->secure(true)
    ->httpOnly(true)
    ->sameSite('strict');
```

### 2. Session Rotation
```
php
// Регенерация ID после login
$request->session()->regenerate();
```

### 3. Timeout
```
php
// config/session.php
'lifetime' => 60,
'expire_on_close' => true,
```

### 4. Дополнительные проверки
- IP address
- User agent
- Two-factor authentication
- Biometrics

## Рекомендации

- Использовать secure cookies
- Регенерировать ID после login/logout
- Установить короткое время жизни
- Использовать HTTPS
- Добавить дополнительную валидацию
