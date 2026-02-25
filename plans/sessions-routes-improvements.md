# План: Sessions Routes (6KB)

## Текущее состояние

### Что делает модуль

**Sessions Routes** ([`a2a-server/src/routes/sessions.routes.ts`](a2a-server/src/routes/sessions.routes.ts:1)) — API маршруты для управления сессиями и сообщениями. Предоставляет RESTful интерфейс для создания, получения, обновления и удаления сессий, а также управления сообщениями в рамках сессий.

#### Текущие эндпоинты:

1. **Сессии:**
   - [`POST /api/v1/sessions`](a2a-server/src/routes/sessions.routes.ts:20) — создать новую сессию
   - [`GET /api/v1/sessions`](a2a-server/src/routes/sessions.routes.ts:53) — получить список сессий проекта
   - [`GET /api/v1/sessions/:sessionId`](a2a-server/src/routes/sessions.routes.ts:120) — получить сессию с сообщениями
   - [`PATCH /api/v1/sessions/:sessionId`](a2a-server/src/routes/sessions.routes.ts:146) — обновить сессию (заголовок, статус)
   - [`DELETE /api/v1/sessions/:sessionId`](a2a-server/src/routes/sessions.routes.ts:176) — удалить сессию (мягкое удаление)
   - [`POST /api/v1/sessions/:sessionId/root-context`](a2a-server/src/routes/sessions.routes.ts:83) — отправить корневой контекст

2. **Сообщения:**
   - [`GET /api/v1/sessions/:sessionId/messages`](a2a-server/src/routes/sessions.routes.ts:202) — получить сообщения сессии
   - [`POST /api/v1/sessions/:sessionId/messages`](a2a-server/src/routes/sessions.routes.ts:225) — добавить сообщение

#### Архитектура:

- Все эндпоинты защищены [`authenticate`](a2a-server/src/routes/sessions.routes.ts:7) middleware
- Использует [`sessionService`](a2a-server/src/routes/sessions.routes.ts:8) для операций с сессиями
- Использует [`messageService`](a2a-server/src/routes/sessions.routes.ts:9) для операций с сообщениями
- Интегрируется с [`session-context.service.js`](a2a-server/src/routes/sessions.routes.ts:10) для управления контекстом

---

## Возможности для улучшения

### 1. Валидация входных данных

**Текущее:** Минимальная проверка `projectId` в теле запроса

**Предложения:**
- [x] Добавить Zod схемы для всех request body
- [x] Валидация `sessionId` параметра (UUID формат)
- [x] Валидация `limit`/`offset` query параметров (positive integer)
- [x] Санитизация входящих данных

> **Примечание:** Server does NOT store client data - Graph is passed in context and returned in response; never persist client graph state (согласно AGENTS.md)

### 2. Пагинация и фильтрация

**Текущее:** Базовые `limit`/`offset` параметры

**Предложения:**
- [x] Cursor-based пагинация для больших数据集
- [x] Фильтрация по датам (createdAt, updatedAt)
- [x] Сортировка (по дате, статусу, названию)
- [x] Поля для выбора (fields selection)

### 3. Проверка прав доступа

**Текущее:** Только аутентификация, нет проверки ownership

**Предложения:**
- [x] Проверка что сессия принадлежит проекту клиента
- [x] Проверка что проект принадлежит клиенту
- [x] Role-based access control (RBAC)

### 4. Обработка ошибок

**Текущее:** Базовый error handling через `next(error)`

**Предложения:**
- [x] Кастомные ошибки для каждого типа (NotFound, Validation, etc.)
- [x]统一的 error response format
- [x] Логирование с контекстом (correlation ID)

### 5. rate limiting

**Текущее:** Не реализовано

**Предложения:**
- [x] Rate limit на уровне маршрутов
- [x] Ограничение на создание сессий
- [x] Ограничение на частоту сообщений

### 6. Аудит и метрики

**Текущее:** Базовое логирование

**Предложения:**
- [ ] Audit log для критических операций
- [ ] Метрики использования API
- [ ] Трассировка запросов (correlation ID)

---

## API Эндпоинты

### Сессии

| Метод | Путь | Описание | Тело запроса |
|-------|------|----------|--------------|
| POST | `/api/v1/sessions` | Создать сессию | `{ projectId, title? }` |
| GET | `/api/v1/sessions` | Список сессий | `?projectId, status?, limit?, offset?` |
| GET | `/api/v1/sessions/:id` | Получить сессию | — |
| PATCH | `/api/v1/sessions/:id` | Обновить сессию | `{ title?, status? }` |
| DELETE | `/api/v1/sessions/:id` | Удалить сессию | — |
| POST | `/api/v1/sessions/:id/root-context` | Отправить контекст | `RootContext` |

### Сообщения

| Метод | Путь | Описание | Тело запроса |
|-------|------|----------|--------------|
| GET | `/api/v1/sessions/:id/messages` | Список сообщений | `?limit?, offset?` |
| POST | `/api/v1/sessions/:id/messages` | Создать сообщение | `{ content, direction?, role?, contentText?, promiseId?, status? }` |

### Примеры запросов

```
bash
# Создать сессию
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "proj_123", "title": "My Session"}'

# Получить список сессий
curl http://localhost:3000/api/v1/sessions?projectId=proj_123&limit=10 \
  -H "Authorization: Bearer token"

# Получить сессию
curl http://localhost:3000/api/v1/sessions/sess_123 \
  -H "Authorization: Bearer token"

# Обновить сессию
curl -X PATCH http://localhost:3000/api/v1/sessions/sess_123 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title", "status": "ACTIVE"}'

# Удалить сессию
curl -X DELETE http://localhost:3000/api/v1/sessions/sess_123 \
  -H "Authorization: Bearer token"

# Отправить root context
curl -X POST http://localhost:3000/api/v1/sessions/sess_123/root-context \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"project_path": "/path/to/project"}'

# Получить сообщения
curl http://localhost:3000/api/v1/sessions/sess_123/messages?limit=50 \
  -H "Authorization: Bearer token"

# Создать сообщение
curl -X POST http://localhost:3000/api/v1/sessions/sess_123/messages \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"content": {"text": "Hello"}, "role": "user"}'
```

### Формат ответа

Успешный ответ:
```
json
{
  "success": true,
  "data": { ... }
}
```

Ошибка:
```
json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Зависимости

### Внешние

- **Express** — фреймворк для маршрутизации
- **Prisma** — ORM для работы с базой данных

### Внутренние сервисы

| Сервис | Путь | Назначение |
|--------|------|------------|
| sessionService | [`services/session.service.ts`](a2a-server/src/services/session.service.ts) | CRUD операции для сессий |
| messageService | [`services/message.service.ts`](a2a-server/src/services/message.service.ts) | CRUD операции для сообщений |
| session-context.service | [`services/session-context.service.ts`](a2a-server/src/services/session-context.service.ts) | Управление контекстом сессии |
| authenticate | [`middleware/auth.middleware.ts`](a2a-server/src/middleware/auth.middleware.ts) | Аутентификация |
| logger | [`utils/logger.ts`](a2a-server/src/utils/logger.ts) | Логирование |

### База данных (Prisma)

- **Session** — модель сессии с полями: id, projectId, title, status, context, createdAt, updatedAt, completedAt
- **Message** — модель сообщения с полями: id, sessionId, direction, role, content, contentText, promiseId, status, createdAt
- **SessionStatus** — enum: CREATED, ACTIVE, PAUSED, COMPLETED, ERROR
- **MessageDirection** — enum: CLIENT_TO_SERVER, SERVER_TO_CLIENT
- **MessageStatus** — enum: pending, sent, received, error

### Связанные маршруты

- [`routes/tasks.routes.ts`](a2a-server/src/routes/tasks.routes.ts) — задачи в рамках сессий
- [`routes/projects.routes.ts`](a2a-server/src/routes/projects.routes.ts) — проекты

---

## План развития

### Фаза 1: Улучшение стабильности

1. **Валидация** (приоритет: высокий)
   - [ ] Добавить Zod схемы для всех endpoints
   - [ ] Добавить middleware для валидации
   - [ ] Centralized error handling

2. **Проверка прав** (приоритет: высокий)
   - [ ] Middleware для проверки ownership
   - [ ] Проверка что client имеет доступ к project

### Фаза 2: Расширение функциональности

3. **Пагинация** (приоритет: средний)
   - [ ] Cursor-based pagination
   - [ ] Фильтрация и сортировка
   - [ ] Поля для выбора

4. **Batch операции** (приоритет: средний)
   - [ ] Bulk delete sessions
   - [ ] Bulk update status

5. **Аудит** (приоритет: низкий)
   - [ ] Audit log middleware
   - [ ] Метрики использования

### Фаза 3: Оптимизация

6. **Кэширование** (приоритет: средний)
   - [ ] Кэш часто запрашиваемых сессий
   - [ ] Инвалидация кэша при обновлении

7. ** производительность** (приоритет: средний)
   - [ ] Оптимизация запросов к БД
   - [ ] Индексы для часто используемых полей

### Фаза 4: Новая функциональность

8. **Экспорт/Импорт** (приоритет: низкий)
   - [ ] Экспорт сессии в JSON
   - [ ] Импорт сессии из JSON

---

## Метрики для мониторинга

- Количество активных сессий
- Среднее время жизни сессии
- Количество сообщений на сессию
- Время отклика API endpoints
- Количество ошибок по типам

---

## Риски и ограничения

1. **Stateless дизайн** — сервер не хранит состояние клиента, всё передаётся в контексте
2. **Мягкое удаление** — DELETE endpoint делает soft-delete (изменяет статус на ERROR)
3. **Ограниченная валидация** — текущая реализация требует улучшения
4. **Нет rate limiting** — уязвимость к滥用
