# detect-test-data

| Параметр | Значение |
|----------|----------|
| actionId | detect-test-data |
| categoryId | test-data |
| executorSystemId | script |
| title | Детекция test data |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет используемые подходы к тестовым данным в проекте.

## Детектируемые подходы

### JavaScript/TypeScript
- Fixtures files
- Factories
- Faker/Mockgen
- Database seeding

### PHP/Laravel
- Model Factories
- Seeders
- Factories with states
- Database migrations for testing

## Процесс

1. Поиск файлов с тестовыми данными
2. Анализ структуры
3. Определение инструментов

## Результат

- Тип используемых данных
- Пути к файлам
- Инструменты генерации
- Рекомендации по улучшению
