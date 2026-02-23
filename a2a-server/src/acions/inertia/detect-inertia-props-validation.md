# detect-inertia-props-validation

| Параметр | Значение |
|----------|----------|
| actionId | detect-inertia-props-validation |
| categoryId | inertia |
| executorSystemId | script |
| title | Валидация props в Inertia-компонентах |
| stack | laravel-vue |
| canMigrateToScript | ✅ |

## Описание

Скрипт детектирует проблемы с валидацией props в Inertia-компонентах.

## Типы проблем

- Отсутствие определения props
- Неправильная типизация props
- Отсутствие default значений
- Проблемы с optional props

## Анализируемые файлы

- Vue компоненты с Inertia props
- Layout компоненты

## Инструменты

- ESLint плагин для Vue
- AST анализ
- TypeScript анализ
