# detect-snapshot-tests

| Параметр | Значение |
|----------|----------|
| actionId | detect-snapshot-tests |
| categoryId | snapshot |
| executorSystemId | script |
| title | Детекция snapshot тестов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет наличие snapshot тестов в проекте.

## Детектируемые инструменты

### JavaScript/TypeScript
- Jest snapshots (toMatchSnapshot)
- Vitest snapshots
- Storybook snapshots

### Другие
- Chai snapshot
- Custom implementations

## Процесс

1. Поиск snapshot файлов
2. Анализ использования
3. Определение coverage

## Результат

- Наличие snapshot тестов
- Количество snapshots
- Файлы со snapshots
- Рекомендации
