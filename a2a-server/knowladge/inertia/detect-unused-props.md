# detect-unused-props

| Параметр | Значение |
|----------|----------|
| actionId | detect-unused-props |
| categoryId | inertia |
| executorSystemId | script |
| title | Детекция неиспользуемых props |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование Vue компонентов для обнаружения неиспользуемых Inertia props.

## Что обнаруживается

- Props, определённые но не используемые в шаблоне
- Props, используемые только в setup, но не в template
- Props с дефолтными значениями, которые не нужны
- Props которые передаются, но не нужны

## Примеры

```
vue
<script setup>
defineProps(['title', 'user', 'posts'])

// title - не используется
// user - используется
// posts - не используется
</script>

<template>
  <div>
    <h1>{{ user.name }}</h1>
  </div>
</template>
```

## Инструменты

- ESLint plugin vue
- Vite plugin
- unplugin-vue-defineprops
- Custom static analysis

## Рекомендации

- Удалять неиспользуемые props
- Использовать Typescript для типизации
- Документировать обязательные props
- Проверять перед коммитом
