# detect-auth-strategy

| Параметр | Значение |
|----------|----------|
| actionId | detect-auth-strategy |
| categoryId | auth |
| executorSystemId | script |
| title | Детекция стратегии аутентификации |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование для определения используемой стратегии аутентификации.

## Что обнаруживается

### Типы аутентификации
- Session-based
- Token-based (JWT)
- OAuth 2.0
- API Keys
- Basic Auth
- Custom tokens

### Framework-специфичные
- Laravel: Sanctum, Passport, Jetstream
- Express: Passport, JWT
- NestJS: Passport, Guards
- Django: Built-in auth

## Детекторы

### Laravel
- config/auth.php
- app/Http/Controllers/Auth/
- vendor/laravel/sanctum
- vendor/laravel/passport

### Express
- passport.js
- jsonwebtoken
- auth0

### NestJS
- @nestjs/passport
- @nestjs/jwt

## Анализ

- User model
- Auth controllers
- Middleware
- Token generation
- Password hashing
- Session management
