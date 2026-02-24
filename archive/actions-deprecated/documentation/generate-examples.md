# generate-examples

| Параметр | Значение |
|----------|----------|
| actionId | generate-examples |
| categoryId | documentation |
| executorSystemId | agent |
| title | Генерация примеров использования |
| canMigrateToScript | ✅ |

## Описание

Агент генерирует примеры использования кода, API или функций проекта.

## Типы примеров

### Базовые примеры
- Hello World
- Минимальный пример
- Базовая конфигурация

### Продвинутые примеры
- Интеграции с другими библиотеками
- Сложные сценарии использования
- Edge cases
- Обработка ошибок

### Реальные сценарии
- Полноценные use cases
- Бизнес-логика
- Production примеры

## Форматы примеров

- Code snippets
- Полные файлы
- Интерактивные примеры
- Тесты-примеры

## Языки

- JavaScript / TypeScript
- Python
- PHP
- Go
- Rust
- Другие по необходимости

## Рекомендации

- Начинать с простого
- Добавлять комментарии
- Показывать разные варианты
- Включать тесты
- Документировать каждую строку

## Структура

```
examples/
├── basic/
│   ├── hello-world/
│   └── basic-usage/
├── intermediate/
│   └── integration/
└── advanced/
    └── production/
```

## Генерируемые файлы

- example.js / example.ts
- README.md
- test.example.js
- fixture files
