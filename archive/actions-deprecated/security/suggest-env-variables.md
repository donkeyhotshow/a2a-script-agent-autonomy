# suggest-env-variables

| Параметр | Значение |
|----------|----------|
| actionId | suggest-env-variables |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение env переменных |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать переменные окружения для хранения конфиденциальных данных.

## Что выносить в env

- API keys
- Database credentials
- JWT secrets
- Encryption keys
- AWS credentials
- Third-party service credentials
- Configuration values (не для prod)

## Примеры

### JavaScript/Node.js
```
javascript
// Плохо
const API_KEY = "sk_live_123456789"

// Хорошо
const API_KEY = process.env.API_KEY
```

### PHP/Laravel
```
php
// Плохо
$apiKey = "sk_live_123456789"

// Хороше
$apiKey = env('API_KEY');
```

## Best Practices

- Использовать .env файлы
- Добавлять .env в .gitignore
- Использовать .env.example для документации
- Использовать vault для production
- Не логировать env переменные
