# suggest-inertia-usepage-fix

| Параметр | Значение |
|----------|----------|
| actionId | suggest-inertia-usepage-fix |
| categoryId | inertia |
| executorSystemId | agent |
| title | Предложение исправления usePage |
| stack | laravel-vue |
| canMigrateToScript | ⏳ |

## Описание

Агент предлагает исправления для проблем с usePage в Inertia.js.

## Типы исправлений

- Правильное использование usePage хука
- Доступ к props и errors
- Типизация usePage
- Использование shared data
- Доступ к flash messages

## Примеры

```
javascript
import { usePage } from '@inertiajs/vue3'

// Правильное использование
const { props } = usePage()

// Доступ к errors
const { errors } = usePage()

// Типизированный доступ
const page = usePage<{ user: User }>()
const user = page.props.user
```

## Рекомендации

- Использовать деструктуризацию для доступа к props
- Типизировать usePage для TypeScript
- Использовать page.props.errors для валидации
- Использовать page.props.auth для данных пользователя
