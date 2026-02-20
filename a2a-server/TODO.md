# A2A Server — Задачи

## Обзор

A2A Server — минималистичный сервер для асинхронной обработки запросов. 
Хранит только запросы (requests) в очереди. Не хранит проекты, сессии или сообщения.

---

## Текущая задача: Асинхронный протокол

### Принципы

1. Сервер принимает запрос → возвращает promiseId
2. Сервер сохраняет запрос в очередь (PostgreSQL)
3. Клиент опрашивает сервер по promiseId
4. Сервер не знает про сессии — только про requests

### Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/v1/requests | Создать запрос → promiseId |
| GET | /api/v1/requests/:promiseId/status | Получить статус |
| GET | /api/v1/requests/:promiseId/result | Получить результат |
| DELETE | /api/v1/requests/:promiseId | Отменить запрос |

### Request Processor (timer loop)

**Важно:** Поток с таймером обрабатывает первый pending-запрос.

| Событие | Действие |
|---------|----------|
| Ошибка | Остановка, request → failed |
| Граф знаний неполный | Генерируется вопрос, пишется в лог, request → completed с `outcome: graph_incomplete`, остановка |
| Успех | request → completed, следующий tick |

- Лог: `[RequestProcessor] Graph incomplete, question generated` — контрольная точка
- Конфиг: `REQUEST_PROCESSOR_INTERVAL_MS` (default 5000)

### Задачи

- [ ] Добавить модель Request в Prisma schema
- [ ] Создать requests.routes.ts с 4 endpoint'ами
- [ ] Обновить routes/index.ts
- [ ] Удалить SessionService, MessageService
- [ ] Удалить sessions.routes.ts
- [ ] Удалить websocket код

---

## База данных

### Таблица requests (единственная для протокола)

```sql
CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    promise_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    context JSONB NOT NULL,
    message_text TEXT,
    code_blocks JSONB,
    result JSONB,
    error JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

### Статусы

| Статус | Описание |
|--------|----------|
| pending | В очереди |
| processing | Обрабатывается |
| completed | Готов |
| failed | Ошибка |
| cancelled | Отменён |

---

## Архитектура

```
┌─────────────┐     POST /requests      ┌─────────────┐
│   CLIENT    │ ──────────────────────▶ │   SERVER    │
│             │ ◀────────────────────── │             │
│ .a2a/sessions│     { promiseId }      │  PostgreSQL │
│  messages   │                         │   requests  │
│  promiseId  │     GET /status         │             │
│  (cookie)   │ ──────────────────────▶ │             │
└─────────────┘ ◀────────────────────── └─────────────┘
                  { status, result }
```

---

## История изменений

### Рефакторинг: Stateless Server ✅ ЗАВЕРШЁН

- [x] Удалены модели Project, Session, Task, Message (кроме requests)
- [x] Упрощены endpoints — только /invoke и /message
- [x] Упрощена аутентификация

### Knowledge Graph — Нейроны ✅ ЗАВЕРШЁН

- [x] Добавлены нейроны для активации контекста
