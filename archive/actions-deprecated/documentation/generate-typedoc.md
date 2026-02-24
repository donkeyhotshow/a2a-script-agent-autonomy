# generate-typedoc

| Параметр | Значение |
|----------|----------|
| actionId | generate-typedoc |
| categoryId | documentation |
| executorSystemId | script |
| title | Генерация TypeDoc |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация документации TypeDoc для TypeScript проектов.

## Инструменты

- TypeDoc
- typedoc-plugin-markdown
- typedoc-plugin-pages
- typedoc-plugin-versions

## Генерируемая документация

- Модули
- Классы
- Интерфейсы
- Типы
- Функции
- Перечисления (Enums)
- Переменные

## TypeDoc теги

- @param - Параметры
- @returns - Возвращаемое значение
- @example - Примеры
- @see - Ссылки
- @deprecated - Устаревшие элементы
- @public - Публичные элементы
- @private - Приватные элементы
- @protected - Защищенные элементы
- @internal - Внутренние элементы

## Конфигурация

```
json
{
  "entryPoint": "./src/index",
  "out": "./docs",
  "name": "Project Name",
  "includeVersion": true,
  "readme": "./README.md"
}
```

## Форматы вывода

- HTML
- Markdown
- JSON

## Интеграции

- GitHub Pages
- npm publish
- webpack
- vite
