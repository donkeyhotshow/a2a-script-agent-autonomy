# generate-openapi-spec

| Параметр | Значение |
|----------|----------|
| actionId | generate-openapi-spec |
| categoryId | api-design |
| executorSystemId | script |
| title | Генерация OpenAPI spec |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация OpenAPI (Swagger) спецификации из кода или существующих данных.

## Что генерируется

### Основные компоненты
- Paths (эндпоинты)
- Components (схемы, параметры, responses)
- Security schemes
- Tags
- Operations

### Документация
- Описание эндпоинтов
- Параметры запросов
- Тела запросов
- Responses
- Примеры

## Пример вывода

```
yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
```

## Инструменты

- Swagger/OpenAPI generators
- Laravel/Scribe
- FastAPI (Python)
- NestJS Swagger
- Express Swagger
- Custom scripts

## Best practices

- Версионирование
- Описательные summary/description
- Examples для всех схем
- Security definitions
- Correct response codes
