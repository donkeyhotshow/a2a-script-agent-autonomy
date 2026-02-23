# generate-ts-types

| Параметр | Значение |
|----------|----------|
| actionId | generate-ts-types |
| categoryId | inertia |
| executorSystemId | script |
| title | Генерация TS типов из PHP |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация TypeScript типов из PHP классов (моделей, ресурсов, DTO) для использования с Inertia.

## Генерируемые типы

- Interfaces из моделей
- Types из ресурсов
- Union types из enum
- Nested types для отношений

## Примеры

### PHP Model
```
php
// app/Models/User.php
class User extends Model
{
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
}
```

### TypeScript Result
```
typescript
// types/models.d.ts
interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  posts?: Post[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}
```

## Инструменты

- openapi-typescript-generator
- transformer-php-types
- Custom scripts
- Larave IDE Helper

## Best practices

- Генерировать после изменений моделей
- Использовать Zod для runtime validation
- Документировать сложные типы
- Версионировать типы
