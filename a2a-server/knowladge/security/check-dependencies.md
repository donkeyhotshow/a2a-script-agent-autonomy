# check-dependencies

| Параметр | Значение |
|----------|----------|
| actionId | check-dependencies |
| categoryId | security |
| executorSystemId | script |
| title | Проверка зависимостей |
| canMigrateToScript | ✅ |

## Описание

Автоматическая проверка зависимостей проекта на наличие уязвимостей и устаревших версий.

## Проверяемые аспекты

- Известные CVEs
- Устаревшие версии пакетов
- Неподдерживаемые пакеты
- License compliance
- Deprecated APIs
- Неиспользуемые зависимости

## Инструменты

- npm audit / yarn audit
- Composer audit
- Dependabot
- Snyk
- Greenkeeper
- Renovate

## Действия при обнаружении проблем

- Автоматическое обновление
- Создание PR с исправлениями
- Уведомление команды
- Блокировка деплоя
