# План: Requests Routes (4KB)

## Текущее состояние

### Что делает модуль

**Requests Routes** ([`a2a-server/src/routes/requests.routes.ts`](a2a-server/src/routes/requests.routes.ts:1)) — API маршруты для асинхронной обработки запросов с использованием promiseId. Предоставляет RESTful интерфейс для создания запросов, отслеживания статуса, получения результатов и управления очередью запросов.

#### Текущие эндпоинты:

1. **Создание и получение:**
   - [`POST /api/v1/requests`](a2a-server/src/routes/requests.routes.ts:17) — создать новый запрос и получить promiseId
   - [`GET /api/v1/requests/:promiseId/status`](a2a-server/src/routes/requests.routes.ts:59) — получить статус запроса
   - [`GET /api/v1/requests/:promiseId/result`](a2a-server/src/routes/requests.routes.ts:85) — получить полный результат запроса

2. **Управление:**
   - [`DELETE /api/v1/requests/:promiseId`](a2a-server/src/routes/requests.routes.ts:136) — отменить запрос
   - [`DELETE /api/v1/requests/queue/pending`](a2a-server/src/routes/requests.routes.ts:119) — отменить все ожидающие запросы

3. **Мониторинг:**
   - [`GET /api/v1/requests/queue/stats`](a2a-server/src/routes/requests.routes.ts:162) — получить статистику очереди

#### Архитектура:

- Все эндпоинты защищены [`authenticate`](a2a-server/src/routes/requests.routes.ts:7) middleware
- Использует [`requestService`](a2a-server/src/routes/requests.routes.ts:8) для операций с запросами
- Работает с PromiseId для асинхронной идентификации запросов

---

## Возможности для улучшения

### 1. Валидация входных данных

**Текущее:** Минимальная проверка `context` в теле запроса

**Предложения:**
- [x] Добавить Zod схемы для всех request body
- [x] Валидация `promiseId` параметра (формат: `req_*`)
- [x] Валидация структуры context
- [x] Валидация codeBlocks (максимальный размер, типы файлов)
- [x] Санитизация входящих данных

### 2. Проверка прав доступа

**Текущее:** Только аутентификация, нет проверки ownership

**Предложения:**
- [x] Проверка что запрос принадлежит клиенту
- [x] Проверка доступа к context проекта
- [x] Role-based access control (RBAC)

### 3. Расширенные операции с очередью

**Текущее:** Базовое получение stats и cancel all

**Предложения:**
- [x] Пагинация списка запросов
- [x] Фильтрация по статусу, дате, clientId
- [x] Batch операции (bulk cancel, bulk delete)
- [x] Приоритизация запросов (priority update)

### 4. Обработка ошибок

**Текущее:** Базовый error handling через `next(error)`

**Предложения:**
- [x] Кастомные ошибки для каждого типа (NotFound, Validation, Timeout)
- [x] Unified error response format
- [x] Логирование с контекстом (correlation ID)
- [x] Retry policy для клиента

### 5. Rate limiting и квоты

**Текущее:** Не реализовано

**Предложения:**
- [x] Rate limit на уровне маршрутов
- [x] Ограничение на создание запросов в минуту
- [x] Квота на размер queue для клиента

### 6. Мониторинг и аналитика

**Текущее:** Базовое логирование

**Предложения:**
- [x] Метрики времени обработки
- [x] Метрики по статусам (completed/failed/pending)
- [x] Логирование времени выполнения
- [x] Alerting при аномалиях

---

## API Эндпоинты

### Управление запросами

| Метод | Путь | Описание | Тело запроса |
|-------|------|----------|--------------|
| POST | `/api/v1/requests` | Создать запрос | `{ context, message?, codeBlocks?, priority? }` |
| GET | `/api/v1/requests/:promiseId/status` | Получить статус | — |
| GET | `/api/v1/requests/:promiseId/result` | Получить результат | — |
| DELETE | `/api/v1/requests/:promiseId` | Отменить запрос | — |

### Управление очередью

| Метод | Путь | Описание | Тело запроса |
|-------|------|----------|--------------|
| DELETE | `/api/v1/requests/queue/pending` | Отменить все pending | — |
| GET | `/api/v1/requests/queue/stats` | Статистика очереди | — |

### Примеры запросов

```bash
# Создать запрос
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "context": {"project_path": "/path/to/project"},
    "message": "Analyze this code",
    "priority": 1
  }'

# Получить статус
curl http://localhost:3000/api/v1/requests/req_1234567890/status \
  -H "Authorization: Bearer token"

# Получить результат
curl http://localhost:3000/api/v1/requests/req_1234567890/result \
  -H "Authorization: Bearer token"

# Отменить запрос
curl -X DELETE http://localhost:3000/api/v1/requests/req_1234567890 \
  -H "Authorization: Bearer token"

# Отменить все pending
curl -X DELETE http://localhost:3000/api/v1/requests/queue/pending \
  -H "Authorization: Bearer token"

# Получить статистику
curl http://localhost:3000/api/v1/requests/queue/stats \
  -H "Authorization: Bearer token"
```

### Формат ответа

Успешный ответ:
```json
{
  "success": true,
  "data": { ... }
}
```

Ошибка:
```json
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
| requestService | [`services/request.service.ts`](a2a-server/src/services/request.service.ts) | CRUD операции для запросов |
| authenticate | [`middleware/auth.middleware.ts`](a2a-server/src/middleware/auth.middleware.ts) | Аутентификация |
| logger | [`utils/logger.ts`](a2a-server/src/utils/logger.ts) | Логирование |

### База данных (Prisma)

- **Request** — модель запроса с полями: id, promiseId, clientId, status, priority, context, message, codeBlocks, result, error, createdAt, startedAt, completedAt
- **RequestStatus** — enum: pending, processing, completed, failed, cancelled

### Связанные маршруты

- [`routes/sessions.routes.ts`](a2a-server/src/routes/sessions.routes.ts) — сессии
- [`routes/tasks.routes.ts`](a2a-server/src/routes/tasks.routes.ts) — задачи

---

## План развития

### Фаза 1: Улучшение стабильности

1. **Валидация** (приоритет: высокий)
   - [ ] Добавить Zod схемы для всех endpoints
   - [ ] Middleware для валидации promiseId
   - [ ] Centralized error handling
   - [ ] Валидация codeBlocks

2. **Проверка прав** (приоритет: высокий)
   - [ ] Middleware для проверки ownership запроса
   - [ ] Проверка что client имеет доступ к context

### Фаза 2: Расширение функциональности

3. **Список запросов** (приоритет: средний)
   - [ ] GET /api/v1/requests — список запросов клиента
   - [ ] Пагинация (limit, offset)
   - [ ] Фильтрация по статусу, дате

4. **Batch операции** (приоритет: средний)
   - [ ] Bulk cancel по списку promiseIds
   - [ ] Bulk delete завершённых запросов

5. **Приоритизация** (приоритет: средний)
   - [ ] PATCH /api/v1/requests/:promiseId/priority — изменить приоритет

### Фаза 3: Надёжность

6. **Retry и timeout** (приоритет: средний)
   - [ ] Конфигурируемый timeout для запросов
   - [ ] Retry policy в client SDK

7. **Мониторинг** (приоритет: низкий)
   - [ ] Метрики времени обработки
   - [ ] Alerting при высоком failure rate

### Фаза 4: Оптимизация

8. **Кэширование** (приоритет: средний)
   - [ ] Кэш статусов для частых проверок
   - [ ] Инвалидация кэша при обновлении

9. **Производительность** (приоритет: средний)
   - [ ] Оптимизация запросов к БД
   - [ ] Индексы для часто используемых полей (promiseId, status, clientId)

---

## Метрики для мониторинга

- Количество активных запросов
- Среднее время обработки запроса
- Количество запросов по статусам (completed/failed/pending)
- Время отклика API endpoints
- Количество ошибок по типам
- Размер очереди ожидающих запросов

---

## Риски и ограничения

1. **PromiseId формат** — текущий формат `req_*` требует уникальности
2. **Ограниченная валидация** — текущая реализация требует улучшения
3. **Нет rate limiting** — уязвимость к滥用
4. **Нет проверки ownership** — любой клиент может получить статус любого запроса (требует исправления)
5. **Stateless дизайн** — сервер не хранит состояние клиента, всё передаётся в контексте
