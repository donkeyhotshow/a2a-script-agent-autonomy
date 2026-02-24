# detect-secrets-in-code

| Параметр | Значение |
|----------|----------|
| actionId | detect-secrets-in-code |
| categoryId | security |
| executorSystemId | script |
| title | Детекция секретов в коде |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет секретные данные (пароли, API ключи, токены) в исходном коде.

## Детекция

### Искомые паттерны
- API keys
- AWS credentials
- Private keys
- Database passwords
- JWT secrets
- OAuth tokens

### Методы

1. **Regex patterns** - Поиск по форматам
2. **Entropy analysis** - Высокая энтропия = секрет
3. **Allowlist** - Исключение ложных срабатываний

## Результат

- Список найденных секретов
- Файл и строка
- Тип секрета
- Severity

## Инструменты

- GitHub Secret Scanning
- TruffleHog
- git-secrets
- detect-secrets
- gitleaks
