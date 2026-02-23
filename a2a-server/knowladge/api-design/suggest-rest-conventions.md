# suggest-rest-conventions

| Параметр | Значение |
|----------|----------|
| actionId | suggest-rest-conventions |
| categoryId | api-design |
| executorSystemId | agent |
| title | Предложение REST conventions |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует существующий API и предлагает улучшения для соответствия REST best practices.

## Типичные предложения

### URL Structure
- Resource-based URLs
- Использование существительных во множественном числе
- Вложенные ресурсы для отношений
- Версионирование API

### HTTP Methods
- GET - получение ресурсов
- POST - создание ресурсов
- PUT/PATCH - обновление ресурсов
- DELETE - удаление ресурсов

### Status Codes
- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

### Best Practices
- Пагинация
- Фильтрация
- Сортировка
- Field selection
- HATEOAS
- JSON:API стандарт

## Примеры рекомендаций

1. "Используйте /users вместо /getUsers"
2. "Добавьте пагинацию: /users?page=1&per_page=20"
3. "Используйте 201 Created после создания ресурса"
4. "Добавьте версионирование: /api/v1/users"
