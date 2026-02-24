# suggest-changelog-format

| Параметр | Значение |
|----------|----------|
| actionId | suggest-changelog-format |
| categoryId | documentation |
| executorSystemId | agent |
| title | Предложение формата CHANGELOG |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует проект и предлагает оптимальный формат CHANGELOG.

## Анализируемые факторы

- Тип проекта (библиотека, приложение)
- Частота релизов
- Команда разработки
- Инструменты CI/CD
- Conventional commits

## Предлагаемые форматы

### Keep a Changelog
- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

### Conventional Changelog
- Features
- Bug Fixes
- Breaking Changes
- Documentation
- Performance
- Internal

### Semantic Versioning
- Major (X.0.0)
- Minor (0.X.0)
- Patch (0.0.X)

## Критерии выбора

- Читаемость
- Автоматизация
- Совместимость с инструментами
- Поддержка нескольких языков

## Рекомендации

- Использовать conventional commits
- Автоматизировать генерацию
- Поддерживать обратную совместимость
- Документировать breaking changes
