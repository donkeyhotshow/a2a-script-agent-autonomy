# detect-hardcoded-credentials

| Параметр | Значение |
|----------|----------|
| actionId | detect-hardcoded-credentials |
| categoryId | security |
| executorSystemId | script |
| title | Детекция hardcoded credentials |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет захардкоженные учетные данные в исходном коде.

## Детекция

### Паттерны
- Hardcoded passwords
- Hardcoded usernames
- API keys в коде
- Connection strings
- AWS access keys

### Примеры

```
javascript
// Плохо
const DB_PASSWORD = "secret123"

// Хорошо
const DB_PASSWORD = process.env.DB_PASSWORD
```

## Инструменты

- gitleaks
- TruffleHog
- GitHub Secret Scanning
- detect-secrets
- Scorecard

## Результат

- Список найденных credentials
- Расположение
- Рекомендации по исправлению
