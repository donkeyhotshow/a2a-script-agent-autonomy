# План оптимизации загрузки сессий и унификации роутов

## Текущее состояние

### Существующие роуты в веб-клиенте

| Файл | Рописание |
|------ут | О|------|----------|
| `storage.js` | `GET/PUT/DELETE /api/storage/{namespace}/{key}` | Хранилище |
| `action-handler.js` | `POST /api/sessions/{sessionId}/result` | Отправка результата |
| `web-api-client.js` | Различные через SessionManager | Управление сессиями |
| `session-sync-v2.js` | SSE события | Реальное время |

### Проблемы

1. **Дублирование логики** - несколько мест для загрузки/сохранения сессий
2. **Разные форматы** - нет унифицированного API
3. **Сложность Promise polling** - нужно унифицировать

## Цель

Создать единый унифицированный API для работы с сессиями.

## Унифицированные роуты

### 1. Session API

```
GET    /api/sessions              - Список сессий
GET    /api/sessions/:id         - Получить сессию
POST   /api/sessions             - Создать сессию
DELETE /api/sessions/:id         - Удалить сессию

POST   /api/sessions/:id/result  - Отправить результат (существующий)
GET    /api/sessions/:id/poll    - Polling Promise
```

### 2. Promise API

```
GET    /api/promises/:id         - Polling Promise
GET    /api/promises/:id/status  - Получить статус Promise
```

### 3. Storage API (существующий)

```
GET    /api/storage/:namespace/:key
PUT    /api/storage/:namespace/:key
DELETE /api/storage/:namespace/:key
```

## Оптимизация загрузки сессий

### Текущий поток

```
User opens app
    ↓
Load sessions list → Display in UI
    ↓
Select session → Load full session data
    ↓
Apply to SessionStore
```

### Оптимизированный поток

```
User opens app
    ↓
Load sessions list (lightweight, only IDs and metadata)
    ↓
Select session → Load full session data (cached)
    ↓
Apply to SessionStore (unified)
    ↓
Subscribe to updates (SSE)
```

## Задачи

### Фаза 1: Унификация API

- [ ] Создать единый SessionAPI класс
- [ ] Определить统一的请求/响应格式
- [ ] Обновить action-handler.js

### Фаза 2: Оптимизация загрузки

- [ ] Добавить легковесную загрузку списка сессий
- [ ] Реализовать кэширование
- [ ] Добавить инкрементальную загрузку

### Фаза 3: Promise Polling

- [ ] Унифицировать Promise polling
- [ ] Добавить автоматический retry
- [ ] Интегрировать с UI states

## Типы данных

### Session List Item

```typescript
interface SessionListItem {
  sessionId: string;
  projectId: string;
  status: 'active' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  title?: string;
}
```

### Session Full

```typescript
interface Session {
  sessionId: string;
  projectId: string;
  context: ProtocolContextBlock;
  messages: Message[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}
```

## Приоритеты

1. **Высокий** - Создать SessionAPI класс
2. **Высокий** - Унифицировать Promise polling
3. **Средний** - Оптимизировать загрузку списка
4. **Средний** - Добавить кэширование

## Зависимости

- [`docs/new-request-flow/PROTOCOLS/sessions/`](../../docs/new-request-flow/PROTOCOLS/sessions/README.md)
- [`docs/new-request-flow/PROTOCOLS/promise/`](../../docs/new-request-flow/PROTOCOLS/promise/README.md)
