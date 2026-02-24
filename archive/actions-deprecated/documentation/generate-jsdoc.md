# generate-jsdoc

| Параметр | Значение |
|----------|----------|
| actionId | generate-jsdoc |
| categoryId | documentation |
| executorSystemId | agent |
| title | Генерация JSDoc |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует JSDoc комментарии для JavaScript/TypeScript кода.

## JSDoc теги

- @param - Параметры функции
- @returns - Возвращаемое значение
- @throws - Исключения
- @example - Примеры использования
- @see - Ссылки
- @author - Автор
- @version - Версия
- @deprecated - Устаревшие функции
- @since - Версия с которой добавлено
- @link - Ссылки
- @typedef - Пользовательские типы
- @interface - Интерфейсы

## Инструменты

- JSDoc 3
- TypeDoc (для TypeScript)
- ESDoc
- documentation.js

## Генерируемая документация

- Описание функций/классов
- Параметры и типы
- Возвращаемые значения
- Исключения
- Примеры
- Ссылки на связанные элементы

## Поддерживаемые языки

- JavaScript (ES5, ES6+)
- TypeScript

## Процесс

1. Анализ кода
2. Определение функций, классов, модулей
3. Генерация шаблонов документации
4. Заполнение метаданных
5. Валидация JSDoc синтаксиса
