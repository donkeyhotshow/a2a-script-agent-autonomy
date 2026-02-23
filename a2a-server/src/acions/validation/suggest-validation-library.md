# suggest-validation-library

| Параметр | Значение |
|----------|----------|
| actionId | suggest-validation-library |
| categoryId | validation |
| executorSystemId | agent |
| title | Предложение библиотеки валидации |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует приложение и предлагает использование библиотеки валидации.

## Популярные библиотеки

### JavaScript/TypeScript
- **Zod** - TypeScript-first
- **Yup** - Browser + Node
- **Joi** - Powerful, expressive
- **class-validator** - NestJS
- **validator.js** - Simple strings

### PHP
- **Laravel Validation** - Built-in
- **Respect/Validation** - Fluent API
- **Symfony Validator** - Powerful

### Python
- **Pydantic** - Type hints
- **Marshmallow** - Serialization
- **Cerberus** - Simple

## Примеры

### Zod
```
typescript
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().optional(),
});

type User = z.infer<typeof UserSchema>;
```

### Yup
```
javascript
const schema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});
```

### Laravel
```
php
$request->validate([
    'email' => 'required|email|unique:users',
    'password' => 'required|min:8|confirmed',
]);
```

## Когда рекомендовать

- Нет валидации
- Слабая валидация
- Нужна типизация
- Сложные правила
- Reusable schemas
