# generate-openapi-spec

| Параметр | Значение |
|----------|----------|
| actionId | generate-openapi-spec |
| categoryId | documentation |
| executorSystemId | script |
| title | Генерация OpenAPI спецификации |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация OpenAPI (Swagger) спецификации на основе исходного кода или метаданных API.

## Инструменты

- Swagger UI
- Redoc
- OpenAPI Generator
- ReDoc
- Spectral
- Dredd (валидация)

## Генерируемые компоненты

- Paths (эндпоинты)
- Components (схемы, параметры, ответы)
- Security Schemes
- Tags
- External Docs
- Servers

## Поддерживаемые форматы

- JSON
- YAML

## Процесс генерации

1. Сканирование файлов с маршрутами
2. Извлечение метаданных эндпоинтов
3. Построение схем данных
4. Генерация документации
5. Валидация спецификации

## Интеграции

- Auto-generated UI
- Генерация клиентских SDK
- Генерация серверных заглушек
- Документация для тестирования
