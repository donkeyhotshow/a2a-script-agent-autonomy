# validate-inertia-props

| Параметр | Значение |
|----------|----------|
| actionId | validate-inertia-props |
| categoryId | inertia |
| executorSystemId | script |
| title | Валидация Inertia props |
| canMigrateToScript | ✅ |

## Описание

Автоматическая валидация props в Inertia.js для обеспечения корректности передаваемых данных между бэкендом и фронтендом.

## Типы проверок

- Type checking (проверка типов)
- Required props (обязательные пропсы)
- Nullable props (опциональные пропсы)
- Prop types (строки, числа, массивы, объекты)
- Nested props (вложенные структуры)

## Примеры ошибок

```
javascript
// Ошибки, которые обнаруживаются
- User is not defined
- Cannot read property 'name' of undefined
- Expected array, got object
- Missing required prop: 'posts'
```

## Инструменты

- inertia-laravel-validator
- TypeScript + Zod
- Custom middleware
- PropTypes runtime validation

## Best practices

- Всегда определять типы props
- Использовать TypeScript
- Валидировать на сервере
- Документировать структуру props
