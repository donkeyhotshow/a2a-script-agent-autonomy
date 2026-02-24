# detect-vue-props-emits-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-vue-props-emits-issues |
| categoryId | vue |
| executorSystemId | script |
| title | Детекция проблем defineProps/defineEmits |
| stack | vue |
| canMigrateToScript | ✅ |

## Описание

Скрипт детектирует проблемы с использованием defineProps и defineEmits в Vue 3.

## Типы проблем

- Отсутствие типизации props
- Неправильное использование defineProps
- Проблемы с defineEmits
- Отсутствие декларации emits
- Несоответствие типов

## Анализируемые файлы

- Vue 3 компоненты (.vue)

## Инструменты

- ESLint плагин для Vue
- AST анализ
- TypeScript анализ
