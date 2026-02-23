# detect-api-style

| Параметр | Значение |
|----------|----------|
| actionId | detect-api-style |
| categoryId | api-design |
| executorSystemId | script |
| title | Детекция стиля API |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование кода для определения стиля и архитектуры API.

## Что определяется

### Типы API
- REST API
- GraphQL API
- gRPC
- WebSocket API
- SOAP

### Паттерны
- CRUD операции
- Resource-based URL
- HATEOAS
- Versioning стратегия
- Authentication методы

## Примеры обнаружения

```
REST: GET /api/users, POST /api/users
GraphQL: query { users { name } }
gRPC: service UserService { rpc GetUser }
```

## Инструменты

- Static code analysis
- OpenAPI parser
- Route analysis
- HTTP method detection

## Источники для анализа

- Routes файлы
- Controllers
- Middleware
- Route definitions
- OpenAPI specs
