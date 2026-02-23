# detect-mocks

| Параметр | Значение |
|----------|----------|
| actionId | detect-mocks |
| categoryId | mocking |
| executorSystemId | script |
| title | Детекция mocks |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет используемые mock библиотеки и подходы.

## Детектируемые инструменты

### JavaScript/TypeScript
- Jest mocks (jest.fn(), jest.spyOn)
- Vitest vi.fn(), vi.spyOn()
- Sinon
- MSW (Mock Service Worker)
- Mockttp

### PHP
- PHPUnit MockBuilder
- Mockery
- Prophecy

## Процесс

1. Поиск mock файлов
2. Анализ импортов
3. Определение паттернов

## Результат

- Используемые библиотеки
- Типы моков (unit, integration)
- Качество моков
- Рекомендации
