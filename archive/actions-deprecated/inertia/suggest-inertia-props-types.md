# suggest-inertia-props-types

| Параметр | Значение |
|----------|----------|
| actionId | suggest-inertia-props-types |
| categoryId | inertia |
| executorSystemId | agent |
| title | Предложение типизации Inertia props |
| stack | laravel-vue |
| canMigrateToScript | ⏳ |

## Описание

Агент предлагает типизацию для Inertia props в Vue компонентах.

## Типизация

- Определение типов для props
- Использование TypeScript с Inertia
- Shared types для page props
- Типы для errors и auth

## Примеры

```
typescript
// Типизация Inertia Page
import { Page } from '@inertiajs/core'

interface User {
  id: number
  name: string
  email: string
}

interface Props {
  user: User
  users: User[]
  errors: Record<string, string>
}

declare module '@inertiajs/core' {
  interface Page<Props> {
    props: Props
  }
}
```

## Рекомендации

- Создавать отдельные type файлы
- Использовать shared types для общих props
- Типизировать errors как Record<string, string>
- Использовать generics для компонентов
