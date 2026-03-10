# Этап 1: Инициация запроса

## Описание

Первый этап протокола обмена - когда пользователь отправляет начальную задачу из Web UI.

## Направление

**Web UI → Client API (порт 3001)**

## Схема потока

```
User Input → client.json → Client API
```

## Формат запроса

### Web → Client API

```typescript
interface TaskRequest {
  task: string;           // Описание задачи пользователя
  provider?: string;      // Провайдер (опционально)
  projectId: string;      // ID проекта
}
```

### Пример client.json

```json
{
  "task": "исправить импорты в Vue файлах",
  "projectId": "proj_12345"
}
```

## Обработка на Client API

1. Валидация входящих данных
2. Создание сессии (sessionId)
3. Привязка к проекту
4. Формирование request.json для Server

## Следующий этап

После инициации запрос переходит к [Этап 2: Маршрутизация](02-routing.md)

## References

- [PROTOCOL.md](../PROTOCOL.md)
- [SCHEMAS.md](../SCHEMAS.md)
- [server-invoke-request.schema.json](../json-schemas/server-invoke-request.schema.json)
