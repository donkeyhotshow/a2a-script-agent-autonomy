# update-changelog

| Параметр | Значение |
|----------|----------|
| actionId | update-changelog |
| categoryId | documentation |
| executorSystemId | script |
| title | Обновление CHANGELOG |
| canMigrateToScript | ✅ |

## Описание

Автоматическое обновление CHANGELOG на основе новых коммитов и изменений.

## Инструменты

- standard-version
- conventional-changelog
- auto-changelog
- release-it
- Changesets
- git-chg-log

## Процесс обновления

1. Чтение текущего CHANGELOG
2. Сбор новых коммитов
3. Фильтрация по типам
4. Добавление в начало документа
5. Сохранение форматирования
6. Валидация структуры

## Типы изменений

- feat: Новые функции
- fix: Исправления
- docs: Документация
- style: Форматирование
- refactor: Рефакторинг
- test: Тесты
- chore: Обновления зависимостей

## Форматы

- Markdown
- Keep a Changelog
- Conventional Changelog

## Интеграции

- Git hooks
- CI/CD
- GitHub Releases
- npm version
