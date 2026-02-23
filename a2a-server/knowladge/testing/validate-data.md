# validate-data

| Параметр | Значение |
|----------|----------|
| actionId | validate-data |
| categoryId | testing |
| executorSystemId | script |
| title | Валидация данных |
| canMigrateToScript | ✅ |

## Описание

Автоматическая валидация данных в БД, API ответах, файлах для обеспечения целостности.

## Типы валидации

### Database
- Foreign key constraints
- Unique constraints
- Not null constraints
- Data types
- Data ranges

### API
- Response schemas
- Data types
- Required fields
- Format validation
- Rate limits

### Files
- Schema validation (JSON, YAML, XML)
- Data format
- Encoding
- Size limits

## Инструменты

- Laravel Validation
- Joi
- Zod
- Yup
- JSON Schema
- XML Schema

## Примеры

### Laravel Validation
```
php
Validator::make($data, [
    'email' => 'required|email|unique:users',
    'age' => 'required|integer|min:18',
    'name' => 'required|string|max:255',
]);
```

### Zod Schema
```
javascript
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(2).max(255),
  email: z.string().email(),
  createdAt: z.string().datetime()
});
```

## Best practices

- Валидация на всех уровнях
- Server-side validation
- TypeScript types
- Runtime validation
- Error messages localization
