# detect-auth-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-auth-issues |
| categoryId | security |
| executorSystemId | script |
| title | Детекция проблем аутентификации |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет проблемы с аутентификацией в приложении.

## Детекция

### Проблемы
- Weak password policies
- No rate limiting на login
- Missing password hashing
- Session fixation
- No account lockout
- Predictable tokens

### Проверяемые файлы
- Auth controllers
- Login forms
- Middleware
- Session config

## Результат

- Список уязвимостей
- Severity
- Рекомендации

## Инструменты

- SonarQube
- OWASP ZAP
- Burp Suite
- npm audit
