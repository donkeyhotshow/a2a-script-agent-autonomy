# Асинхронный протокол обмена данными

## Принципы

1. **Сервер минималистичный** - только приём запросов, очередь, возврат promiseId
2. **Сервер не хранит сессии** - не знает про Session, Message, Project
3. **Клиент хранит сессии в .a2a папке проекта** - файлы сессий в проекте
4. **Polling на клиенте** - каждые 5 секунд

---

## Протокол

### Запрос (Client → Server)

```
POST /api/v1/requests
{
  "context": { ... },      // Любой JSON контекст
  "message": "string",     // Текст сообщения
  "codeBlocks": [...]      // Опционально: файлы
}

Response:
{
  "success": true,
  "data": {
    "promiseId": "prm_xxx"
  }
}
```

### Статус (Client → Server)

```
GET /api/v1/requests/:promiseId/status

Response:
{
  "success": true,
  "data": {
    "promiseId": "prm_xxx",
    "status": "pending" | "processing" | "completed" | "failed",
    "createdAt": "2026-02-20T..."
  }
}
```

### Результат (Client → Server)

```
GET /api/v1/requests/:promiseId/result

Response (если готово):
{
  "success": true,
  "data": {
    "promiseId": "prm_xxx",
    "status": "completed",
    "result": { ... },
    "completedAt": "2026-02-20T..."
  }
}
```

### Отмена (Client → Server)

```
DELETE /api/v1/requests/:promiseId

Response:
{
  "success": true,
  "data": {
    "promiseId": "prm_xxx",
    "status": "cancelled"
  }
}
```

---

## База данных (только requests)

```sql
CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    promise_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    
    -- Входящие данные
    context JSONB NOT NULL,
    message_text TEXT,
    code_blocks JSONB,
    
    -- Результат
    result JSONB,
    error JSONB,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX requests_status_idx ON requests(status);
CREATE INDEX requests_client_idx ON requests(client_id);
CREATE INDEX requests_promise_idx ON requests(promise_id);
```

---

## Сервер - файлы

### Создать
- `src/routes/requests.routes.ts` - 4 endpoint'а

### Изменить  
- `src/routes/index.ts` - подключить requests routes
- `prisma/schema.prisma` - добавить модель Request

### Удалить
- `src/services/session.service.ts`
- `src/services/message.service.ts`
- `src/routes/sessions.routes.ts`
- `src/websocket/` - весь каталог

---

## Клиент - файлы

### Изменить
- `web/js/sessions.js` - API для сессий + polling
- `web/js/storage.js` - cookie + API (.a2a)
- `web/css/style.css` - spinner стили

### Создать
- `web/js/api.js` - функции для API сервера

---

## Клиент - структура данных в .a2a папке проекта

```
project/
├── .a2a/
│   ├── index.json          # Индекс проекта
│   ├── sessions/
│   │   ├── sess_1.json     # Сессия с сообщениями
│   │   └── sess_2.json
│   └── config.json         # Конфигурация проекта
```

### Формат файла сессии (sessions/sess_1.json)

```json
{
  "id": "sess_1",
  "projectId": "proj_1",
  "title": "New Session",
  "createdAt": "2026-02-20T...",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Hello",
      "promiseId": "prm_xxx",
      "status": "pending",
      "createdAt": "2026-02-20T..."
    }
  ]
}
```

### Статусы сообщения

| Статус | Описание |
|--------|----------|
| sent | Отправлено |
| pending | Ожидает ответа сервера |
| completed | Ответ получен |
| failed | Ошибка |

---

## UI поведение

1. Пользователь пишет сообщение
2. UI блокирует поле ввода
3. Добавляет сообщение с spinner'ом
4. Сохраняет в .a2a/sessions/
5. Отправляет POST /requests → получает promiseId
6. Сохраняет promiseId в сообщении
7. Запускает polling (setTimeout 5 сек)
8. При completed/failed:
   - Обновляет сообщение в .a2a
   - Убирает spinner
   - Разблокирует поле ввода
   - Добавляет ответ сервера как новое сообщение

---

## Диаграмма

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ UI          │───▶│ Sessions    │───▶│ .a2a folder │     │
│  │ (messages)  │    │ Manager     │    │ (sessions)  │     │
│  └─────────────┘    └──────┬──────┘    └─────────────┘     │
│                            │                                │
│                            ▼                                │
│                    ┌─────────────┐                          │
│                    │ API Client  │                          │
│                    │ + Poller    │                          │
│                    └──────┬──────┘                          │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVER                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ REST API    │───▶│ Request     │───▶│ PostgreSQL  │     │
│  │ /requests   │    │ Service     │    │ (requests)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## UI поведение

1. Пользователь пишет сообщение
2. UI блокирует поле ввода
3. Добавляет сообщение с spinner'ом
4. Сохраняет в .a2a/sessions/sess_x.json
5. Отправляет POST /requests → получает promiseId
6. Сохраняет promiseId в сообщении
7. Запускает polling (setTimeout 5 сек)
8. При completed/failed:
   - Обновляет сообщение в .a2a
   - Убирает spinner
   - Разблокирует поле ввода
   - Добавляет ответ сервера как новое сообщение

---

## Статусы запроса

| Статус | Описание |
|--------|----------|
| pending | В очереди |
| processing | Обрабатывается |
| completed | Готов, есть результат |
| failed | Ошибка |
| cancelled | Отменён клиентом |

---

## Request Processor (таймер)

Сервер запускает поток с таймером (`REQUEST_PROCESSOR_INTERVAL_MS`, default 5s):

1. Берёт первый pending-запрос
2. **Ошибка** → request failed, **остановка** таймера
3. **Граф знаний неполный** → генерируется вопрос, пишется в лог `[RequestProcessor] Graph incomplete, question generated`, request completed с `outcome: graph_incomplete`, **остановка** таймера
4. **Успех** → request completed, следующий tick

Не путать: graph_incomplete — ожидаемый flow (вопрос для пользователя), не ошибка.
