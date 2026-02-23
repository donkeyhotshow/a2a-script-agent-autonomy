# detect-session-security

| Параметр | Значение |
|----------|----------|
| actionId | detect-session-security |
| categoryId | security |
| executorSystemId | script |
| title | Детекция безопасности сессий |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет проблемы с безопасностью сессий.

## Детекция

### Проблемы
- Predictable session IDs
- Missing session timeout
- No session rotation
- No secure cookies
- Session fixation
- Missing HttpOnly
- Missing SameSite

## Результат

- Список уязвимостей
- Текущие настройки
- Рекомендации

## Проверяемые параметры

```
php
// Laravel session config
'session' => [
    'lifetime' => 120,
    'expire_on_close' => true,
    'encrypt' => true,
    'cookie' => 'session',
    'path' => '/',
    'domain' => null,
    'secure' => true,
    'http_only' => true,
    'same_site' => 'strict',
]
