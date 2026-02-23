# scan-dependencies

| Параметр | Значение |
|----------|----------|
| actionId | scan-dependencies |
| categoryId | security |
| executorSystemId | script |
| title | Сканирование зависимостей |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт сканирует все зависимости проекта на наличие уязвимостей и устаревших пакетов.

## Инструменты

- npm audit
- yarn audit
- composer audit
- Snyk
- Dependabot
- Renovate

## Сканируемые области

- Прямые зависимости
- Транзитивные зависимости
- Dev зависимости
- Lock файлы

## Результат

- Список уязвимых пакетов
- Уровень критичности
- Доступные обновления
- CVE идентификаторы

## Команды

```
bash
# npm
npm audit

# yarn
yarn audit

# composer
composer audit
