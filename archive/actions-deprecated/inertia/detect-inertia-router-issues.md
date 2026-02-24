# detect-inertia-router-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-inertia-router-issues |
| categoryId | inertia |
| executorSystemId | script |
| title | Детекция проблем router.visit/get/post |
| stack | laravel-vue |
| canMigrateToScript | ✅ |

## Описание

Скрипт детектирует проблемы с использованием Inertia router (visit, get, post методы).

## Типы проблем

- Неправильное использование методов router
- Отсутствие обработки ошибок
- Проблемы с onBefore/onAfter callbacks
- Неправильное использование preserveState/preserveScroll
- Проблемы с replace vs visit

## Анализируемые файлы

- Vue компоненты с router.visit/get/post
- Любые файлы с Inertia навигацией

## Инструменты

- ESLint плагин для Inertia
- AST анализ
- Pattern matching
