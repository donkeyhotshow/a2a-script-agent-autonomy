# detect-vue-ref-reactive-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-vue-ref-reactive-issues |
| categoryId | vue |
| executorSystemId | script |
| title | Детекция проблем ref/reactive/computed |
| stack | vue |
| canMigrateToScript | ✅ |

## Описание

Скрипт детектирует проблемы с использованием ref, reactive и computed в Vue 3.

## Типы проблем

- Использование ref без .value
- Смешение ref и reactive
- Неправильное использование computed
- Mutable computed
- Проблемы с реактивностью

## Анализируемые файлы

- Vue 3 компоненты (.vue)
- Композиables

## Инструменты

- ESLint плагин для Vue
- AST анализ
- Pattern matching
