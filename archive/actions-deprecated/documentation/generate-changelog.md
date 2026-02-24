# generate-changelog

| Параметр | Значение |
|----------|----------|
| actionId | generate-changelog |
| categoryId | documentation |
| executorSystemId | script |
| title | Генерация CHANGELOG |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация CHANGELOG на основе коммитов, PR и изменений в коде.

## Инструменты

- standard-version
- conventional-changelog
- semantic-release
- auto-changelog
- Release It
- Changesets

## Генерируемые разделы

- Новая версия (New Release)
- Новые функции (Features)
- Исправления багов (Bug Fixes)
- Изменения API (API Changes)
- Устаревшие функции (Deprecations)
- Улучшения (Improvements)
- Миграции (Migrations)

## Источники данных

- Git коммиты
- Pull requests
- Issues
- Теги версий
- Conventional commits
- Файлы изменений

## Форматы

- Markdown
- Keep a Changelog
- Keep a Changelog (Russian)
- JSON

## Процесс

1. Сбор коммитов с последнего тега
2. Группировка по типам
3. Парсинг conventional commits
4. Генерация документации
5. Форматирование вывода
