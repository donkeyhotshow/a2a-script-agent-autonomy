# detect-logging-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-logging-issues |
| categoryId | security |
| executorSystemId | script |
| title | Детекция проблем логирования |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет проблемы с безопасным логированием.

## Детекция

### Проблемы
- Logging sensitive data
- No PII protection
- Missing audit logs
- Verbose error messages
- No log rotation
- Unencrypted logs

## Чувствительные данные

- Passwords
- API keys
- Credit cards
- Personal info
- Session tokens
- Health data

## Результат

- Список найденных уязвимостей
- Рекомендации
- Best practices

## Примеры

```
php
// Плохо
Log::info('User login: ' . $request->all());

// Хороше
Log::info('User login', ['user_id' => $user->id]);
