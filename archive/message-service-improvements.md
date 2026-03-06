# План: Message Service (7KB)

## Текущее состояние

### Что делает сервис

**MessageService** (`a2a-server/src/services/message.service.ts`) — сервис CRUD операций для сообщений в системе A2A.
Обеспечивает хранение и управление сообщениями между клиентом и сервером.

#### Модель данных (Prisma):

```
prisma
model Message {
  id         String          @id
  sessionId  String          @map("session_id")
  direction  MessageDirection  // CLIENT_TO_SERVER | SERVER_TO_CLIENT
  role       MessageRole?    // user | server
  content    Json
  contentText String?        @map("content_text")
  promiseId  String?         @unique @map("promise_id")
  status     MessageStatus?  @default(sent) // sent | pending
  createdAt  DateTime        @default(now()) @map("created_at")
  session    Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([promiseId])
}
```

#### Основные функции:

1. **Создание сообщений** — [`create()`](a2a-server/src/services/message.service.ts:32)
    - Генерация ID: `msg_${timestamp}_${random}`
    - Автоматический статус по умолчанию: `sent`
    - Поддержка promiseId для связи с запросами

2. **Получение сообщений**:
    - [`getById()`](a2a-server/src/services/message.service.ts:78) — по ID
    - [`getBySessionId()`](a2a-server/src/services/message.service.ts:111) — по сессии с пагинацией

3. **Обновление сообщений**:
    - [`update()`](a2a-server/src/services/message.service.ts:148) — по ID
    - [`updateByPromiseId()`](a2a-server/src/services/message.service.ts:196) — по promiseId

4. **Удаление сообщений** — [`delete()`](a2a-server/src/services/message.service.ts:244)

#### Текущее использование:

- [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts) — создание сообщений при
  обработке запросов

---

## Возможности для улучшения

### 1. Типизация контента

**Текущее:** Generic `content: Record<string, unknown>`

**Предложения:**

- [x] Typed content schema (ContentType enum)
- [x] Zod валидация для content
- [x] Type-safe методы с дженериками

### 2. Пакетные операции

**Текущее:** Только одиночные операции

**Предложения:**

- [x] `createMany()` — массовое создание
- [x] `updateMany()` — массовое обновление
- [x] `deleteBySessionId()` — удаление всех сообщений сессии
- [x] Транзакции для связанных операций

### 3. Пагинация и курсоры

**Текущее:** Простой `limit`/`offset`

**Предложения:**

- [x] Cursor-based пагинация
- [x] Metadata в ответе (total, hasMore)
- [x] `getMessagesCursor(sessionId, cursor, limit)`

### 4. Кэширование

**Текущее:** Отсутствует

**Предложения:**

- [ ] LRU кэш для часто читаемых сообщений
- [ ] Инвалидация по sessionId
- [ ] Кэш последних сообщений сессии

### 5. Оптимизация запросов

**Текущее:** Базовые findUnique/findMany

**Предложения:**

- [ ] Select/include оптимизация
- [ ] Batch loading для нескольких сессий
- [ ] Подсчёт количества без получения данных

### 6. Поиск и фильтрация

**Текущее:** Только по sessionId

**Предложения:**

- [ ] Фильтрация по direction/role/status
- [ ] Полнотекстовый поиск по contentText
- [ ] Фильтрация по дате (createdAt range)

### 7. Soft delete и история

**Текущее:** Жёсткое удаление

**Предложения:**

- [ ] Soft delete с полем `deletedAt`
- [ ] Аудит изменений
- [ ] Версионирование сообщений

### 8. Событийная модель

**Текущее:** Отсутствует

**Предложения:**

- [ ] Event emitter: onCreate, onUpdate, onDelete
- [ ] Хуки для бизнес-логики

---

## API методы

### Существующие методы

```
typescript
class MessageService {
  // CRUD
  create(data: CreateMessageData): Promise<Message>;
  getById(messageId: string): Promise<Message | null>;
  getBySessionId(sessionId: string, options?: { limit?: number; offset?: number }): Promise<Message[]>;
  update(messageId: string, data: UpdateMessageData): Promise<Message | null>;
  updateByPromiseId(promiseId: string, data: UpdateMessageData): Promise<Message | null>;
  delete(messageId: string): Promise<boolean>;
}

interface CreateMessageData {
  sessionId: string;
  direction: MessageDirection;
  role?: 'user' | 'server';
  content: Record<string, unknown>;
  contentText?: string;
  promiseId?: string;
  status?: MessageStatus;
}

interface UpdateMessageData {
  content?: Record<string, unknown>;
  contentText?: string;
  promiseId?: string | null;
  status?: MessageStatus;
}
```

### Предлагаемые новые методы

```
typescript
class MessageService {
  // Пакетные операции
  createMany(data: CreateMessageData[]): Promise<Message[]>;
  updateMany(where: MessageWhere, data: UpdateMessageData): Promise<number>;
  deleteBySessionId(sessionId: string): Promise<number>;

  // Расширенная выборка
  getMessagesPaginated(sessionId: string, options: {
    limit?: number;
    cursor?: string;
    direction?: MessageDirection;
    role?: MessageRole;
    status?: MessageStatus;
  }): Promise<PaginatedMessages>;

  // Поиск
  search(sessionId: string, query: string): Promise<Message[]>;
  getByDateRange(sessionId: string, start: Date, end: Date): Promise<Message[]>;

  // Агрегация
  count(sessionId: string, filters?: MessageFilters): Promise<number>;
  getLatest(sessionId: string, limit?: number): Promise<Message[]>;

  // Транзакции
  createWithResponse(requestId: string, data: CreateMessageData): Promise<TransactionResult>;

  // События
  on(event: MessageEvent, handler: EventHandler): void;
  off(event: MessageEvent, handler: EventHandler): void;
}

interface PaginatedMessages {
  data: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

interface MessageFilters {
  direction?: MessageDirection;
  role?: MessageRole;
  status?: MessageStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}
```

---

## Зависимости

### Текущие зависимости

```
json
{
  "dependencies": {
    "@prisma/client": "^5.x"
  },
  "internal": {
    "../utils/logger.js": "logger"
  }
}
```

### Предлагаемые зависимости

```
json
{
  "dependencies": {
    "@prisma/client": "^5.x",
    "zod": "^3.x", // Валидация
    "p-map": "^5.x" // Параллельные операции
  },
  "optional": {
    "ioredis": "^5.x", // Кэширование
    "events": "^3.x" // Event emitter
  }
}
```

---

## План развития

### Фаза 1: Базовая стабилизация ✅

- [x] Текущая реализация (CRUD)
- [x] Индексы Prisma (sessionId, promiseId)
- [x] Логирование операций

### Фаза 2: Типизация и валидация (1 неделя)

**Задачи:**

1. Zod схемы для CreateMessageData/UpdateMessageData
2. Content type enum и валидация
3. Type-safe методы с дженериками

**Файлы:**

- `a2a-server/src/services/message.types.ts` — схемы
- `a2a-server/src/services/message.validator.ts` — валидатор

### Фаза 3: Пакетные операции (1 неделя)

**Задачи:**

1. createMany() с транзакцией
2. deleteBySessionId() каскадом
3. updateMany() с фильтрами

**Файлы:**

- `a2a-server/src/services/message.batch.ts` — пакетные операции

### Фаза 4: Пагинация и курсоры (1 неделя)

**Задачи:**

1. Cursor-based пагинация
2. Metadata (total, hasMore)
3. Фильтрация по полям

**Файлы:**

- `a2a-server/src/services/message.pagination.ts`

### Фаза 5: Кэширование (1 неделя)

**Задачи:**

1. LRU кэш для сообщений
2. Инвалидация по sessionId
3. Кэш последних N сообщений

**Файлы:**

- `a2a-server/src/services/message.cache.ts`

### Фаза 6: События (1 неделя)

**Задачи:**

1. Event emitter
2. Хуки для бизнес-логики

**Файлы:**

- `a2a-server/src/services/message.events.ts`

### Фаза 7: Soft delete и аудит (1 неделя)

**Задачи:**

1. Поле deletedAt
2. Аудит изменений
3. History table

**Миграция:**

- Добавление поля `deletedAt` в schema.prisma

---

## Примеры использования

### Базовое использование

```
typescript
import { messageService, type CreateMessageData } from './services/message.service.js';

// Создание
const msg = await messageService.create({
  sessionId: 'sess_123',
  direction: 'CLIENT_TO_SERVER',
  role: 'user',
  content: { text: 'Привет' },
  contentText: 'Привет',
});

// Получение
const messages = await messageService.getBySessionId('sess_123', { limit: 50 });

// Обновление
await messageService.update(msg.id, { status: 'pending' });
```

### С пагинацией (после Фазы 4)

```
typescript
const result = await messageService.getMessagesPaginated('sess_123', {
  limit: 20,
  cursor: 'msg_12345',
  direction: 'CLIENT_TO_SERVER',
});

console.log(result.hasMore); // boolean
console.log(result.nextCursor); // string | null
```

### С событиями (после Фазы 6)

```
typescript
messageService.on('create', (msg) => {
  // Handle new message
});

messageService.on('delete', ({ messageId, sessionId }) => {
  // Очистка кэша
  cache.invalidate(`messages:${sessionId}`);
});
```

### С кэшированием (после Фазы 5)

```
typescript
// Автоматический кэш
const cached = await messageService.getById('msg_123');
// При обновлении кэш инвалидируется
await messageService.update('msg_123', { status: 'pending' });
```

---

## Критерии успеха

1. **Про производительность**: Время create/read < 5ms
2. **Типизация**: 100% type-safe content API
3. **Масштабируемость**: Поддержка 10k+ сообщений в сессии
4. **Надёжность**: Транзакции для связанных операций

---

## Риски

| Риск                   | Вероятность | Влияние | Митигация               |
|------------------------|-------------|---------|-------------------------|
| Переусложнение API     | Средняя     | Среднее | Фазированная реализация |
| Кэш невалидный         | Средняя     | Высокое | Event-based инвалидация |
| Большие JSON в content | Средняя     | Среднее | Лимиты и компрессия     |

---

**Дата:** 2026-02-24  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~7KB (включая все предложения)
