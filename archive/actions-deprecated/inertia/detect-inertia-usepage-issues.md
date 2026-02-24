# detect-inertia-usepage-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-inertia-usepage-issues |
| categoryId | inertia |
| executorSystemId | script |
| title | Детекция проблем usePage |
| stack | laravel-vue |
| canMigrateToScript | ✅ |

## Описание

Скрипт детектирует проблемы с использованием usePage в Inertia.js компонентах.

## Типы проблем

- Неправильное использование usePage
- Отсутствие типизации
- Проблемы с доступом к props
- Неправильное использование $page
- Проблемы с shared data

## Анализируемые файлы

- Vue компоненты с usePage
- Layout компоненты

## Инструменты

- ESLint плагин для Inertia
- AST анализ
- Pattern matching
