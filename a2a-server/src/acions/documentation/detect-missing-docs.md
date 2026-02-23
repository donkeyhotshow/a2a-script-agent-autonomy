# detect-missing-docs

| Параметр | Значение |
|----------|----------|
| actionId | detect-missing-docs |
| categoryId | documentation |
| executorSystemId | script |
| title | Детекция отсутствующей документации |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование проекта для обнаружения файлов и компонентов без документации.

## Сканируемые элементы

- Файлы без JSDoc/PHPDoc
- Функции без описания
- Классы без документации
- Модули без readme
- Эндпоинты без описания
- Компоненты без примеров
- Отсутствующие типы

## Инструменты

- JSDoc (--explain)
- phpDocumentor
- ESLint (eslint-plugin-doc)
-phan
- Psalm
- SonarQube

## Процесс

1. Сканирование структуры проекта
2. Анализ файлов на наличие документации
3. Проверка覆盖率 документации
4. Генерация отчета
5. Приоритизация по важности

## Метрики

- Documentation Coverage (%)
- Undocumented functions
- Undocumented classes
- Missing examples
- Missing API descriptions

## Отчет

Содержит:
- Список файлов без документации
- Уровень важности
- Рекомендации по исправлению
- Шаблоны документации

## Форматы отчета

- JSON
- Markdown
- HTML
- Console output
