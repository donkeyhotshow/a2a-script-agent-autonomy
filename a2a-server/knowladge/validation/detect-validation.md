# detect-validation

| Параметр | Значение |
|----------|----------|
| actionId | detect-validation |
| categoryId | validation |
| executorSystemId | script |
| title | Детекция валидации |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование для определения используемой валидации данных.

## Что обнаруживается

### Типы валидации
- Server-side validation
- Client-side validation
- Form validation
- API request validation
- Database constraints

### Framework-специфичные
- Laravel: Form Requests, Validation
- Express: Joi, express-validator
- NestJS: class-validator, pipes
- Django: Forms, serializers

## Детекторы

### Laravel
- app/Http/Requests/
- Validator::make()
- $rules in models

### Express
- joi schemas
- express-validator
- middleware/validation

### NestJS
- @IsString(), @IsEmail()
- ValidationPipe
- DTOs

## Best practices

- Валидация на всех уровнях
- Server-side обязательно
- Client-side для UX
- Сообщения об ошибках
- Sanitization
