# detect-secrets

| Параметр | Значение |
|----------|----------|
| actionId | detect-secrets |
| categoryId | security |
| executorSystemId | script |
| title | Детекция секретов |
| canMigrateToScript | ✅ |

## Описание

Сканирование репозитория для обнаружения случайно закоммиченных секретов (пароли, API ключи, токены, приватные ключи).

## Типы обнаруживаемых секретов

- API ключи
- Пароли
- Токены доступа
- Приватные ключи
- AWS credentials
- SSH ключи
- Connection strings
- JWT токены
- OAuth secrets

## Инструменты

- GitHub Secrets Scanning
- GitLab Secrets Detection
- TruffleHog
- git-secrets
- AWS Secrets Detector
- Secretlint
- Gitleaks

## best practices

- Pre-commit hooks
- Сканирование при push
- Регулярное сканирование
- Ротация скомпрометированных ключей
