# detect-inertia-preservestate-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-inertia-preservestate-issues |
| categoryId | inertia |
| executorSystemId | script |
| title | Детекция preserveState/preserveScroll |
| stack | laravel-vue |
| canMigrateToScript | ✅ |

## Описание

Скрипт детектирует проблемы с использованием preserveState и preserveScroll в Inertia.

## Типы проблем

- Отсутствие preserveState при needed
- Неправильное использование preserveScroll
- Проблемы с историей навигации
- Потеря состояния формы при навигации

## Анализируемые файлы

- Vue компоненты с Inertia навигацией
- Файлы с формами

## Инструменты

- ESLint плагин для Inertia
- AST анализ
- Pattern matching

## Решения

- Использовать preserveState: true для сохранения формы
- Использовать preserveScroll для сохранения позиции
- Комбинировать с replace: false
