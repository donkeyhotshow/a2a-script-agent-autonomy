# План: Message Builder (12KB)

## Текущее состояние

### Что делает билдер сообщений

**Message Builder** ([`a2a-server/src/protocol/message-builder.ts`](a2a-server/src/protocol/message-builder.ts)) — основной компонент для построения сообщений согласно A2A протоколу. Выполняет создание, валидацию, сериализацию и парсинг сообщений клиента и сервера.

#### Основные функции:

1. **Client Message Builders** — построение сообщений от клиента:
   - [`buildClientMessage()`](a2a-server/src/protocol/message-builder.ts:53) — базовое сообщение с контекстом и файлами
   - [`buildNewTaskMessage()`](a2a-server/src/protocol/message-builder.ts:69) — сообщение о новой задаче
   - [`buildContinueMessage()`](a2a-server/src/protocol/message-builder.ts:81) — сообщение continue
   - [`buildConfirmMessage()`](a2a-server/src/protocol/message-builder.ts:93) — сообщение подтверждения
   - [`buildFileResponseMessage()`](a2a-server/src/protocol/message-builder.ts:105) — ответ с файлами

2. **Server Message Builders** — построение сообщений от сервера:
   - [`buildServerMessage()`](a2a-server/src/protocol/message-builder.ts:120) — базовое серверное сообщение
   - [`buildFileRequestMessage()`](a2a-server/src/protocol/message-builder.ts:143) — запрос файлов
   - [`buildTaskProgressMessage()`](a2a-server/src/protocol/message-builder.ts:154) — прогресс задачи
   - [`buildErrorMessage()`](a2a-server/src/protocol/message-builder.ts:178) — сообщение об ошибке
   - [`buildSessionCompleteMessage()`](a2a-server/src/protocol/message-builder.ts:203) — завершение сессии
   - [`buildAckMessage()`](a2a-server/src/protocol/message-builder.ts:225) — acknowledgment
   - [`buildNeuronActivationMessage()`](a2a-server/src/protocol/message-builder.ts:236) — активация нейронов

3. **Валидация сообщений**:
   - [`isValidMessage()`](a2a-server/src/protocol/message-builder.ts:30) — type guard для валидности
   - [`validateMessage()`](a2a-server/src/protocol/message-builder.ts:297) — полная валидация структуры
   - [`isClientMessage()`](a2a-server/src/protocol/message-builder.ts:356) — проверка типа ClientMessage
   - [`isServerMessage()`](a2a-server/src/protocol/message-builder.ts:363) — проверка типа ServerMessage

4. **Сериализация/Парсинг**:
   - [`serializeMessage()`](a2a-server/src/protocol/message-builder.ts:260) — в JSON строку
   - [`parseMessage()`](a2a-server/src/protocol/message-builder.ts:267) — парсинг из JSON
   - [`parseMessageSafe()`](a2a-server/src/protocol/message-builder.ts:286) — безопасный парсинг (возвращает null)

5. **Утилиты для работы с сообщениями**:
   - [`getSessionId()`](a2a-server/src/protocol/message-builder.ts:370) — получить session ID
   - [`cloneMessage()`](a2a-server/src/protocol/message-builder.ts:377) — глубокое клонирование
   - [`updateMessageContext()`](a2a-server/src/protocol/message-builder.ts:384) — обновить контекст

6. **Request API Builders** — для Response:
   - [`buildRequestContextBlock()`](a2a-server/src/protocol/message-builder.ts:406) — построить контекст блок
   - [`buildRequestApiResult()`](a2a-server/src/protocol/message-builder.ts:446) — построить полный результат API

#### Типы данных:

```typescript
interface ContextBlock {
  version: '1.0';
  session_id: string;
  continue?: boolean;
  confirm?: boolean;
  tasks?: Task[];
  errors?: Array<{ code: string; message: string; file?: string; line?: number }>;
  // ... другие поля
}

interface ClientMessage {
  context: ContextBlock;
  files?: FileBlock[];
}

interface ServerMessage {
  context: ContextBlock;
  files?: FileBlock[];
  message?: string;
}

interface RequestApiResult {
  outcome: 'completed' | 'graph_incomplete' | 'failed';
  message?: string;
  context?: RequestContextBlock;
  questions?: string[];
  missing?: string[];
  graph_stats?: GraphStats;
  activated_neuron_ids?: string[];
  injected_content?: string[];
  error?: { code: string; message: string };
}
```

#### Текущее использование:

- [`message.service.ts`](a2a-server/src/services/message.service.ts) — построение и отправка сообщений
- [`protocol.router.ts`](a2a-server/src/protocol/protocol.router.ts) — валидация входящих сообщений
- [Request API](a2a-server/src/server) — построение ответов API

---

## Возможности для улучшения

### 1. Расширенная валидация

**Текущее:** Базовые проверки типов через type guards

**Предложения:**
- [ ] Схема валидации с Zod для всех типов сообщений
- [ ] Валидация session_id (формат UUID)
- [ ] Валидация version (semver)
- [ ] Валидация TaskStatus (enum)
- [ ] Валидация outcome (enum)
- [ ] Custom error codes с описаниями
- [ ] Dry-run validation (без throw)

### 2. Template Engine

**Текущее:** Ручное построение объектов

**Предложения:**
- [ ] Message templates (预设消息模板)
- [ ] Template inheritance
- [ ] Variable interpolation
- [ ] Conditional fields
- [ ] Template registry/caching

### 3. Fluent API

**Текущее:** Функциональный стиль с отдельными функциями

**Предложения:**
- [ ] Builder pattern для сложных сообщений
- [ ] Method chaining
- [ ] Default values
- [ ] Partial builders

```typescript
// Пример Fluent API
const message = new MessageBuilder()
  .sessionId('abc-123')
  .task({ id: 'task-1', status: 'pending' })
  .file(fileBlock)
  .error({ code: 'FILE_NOT_FOUND', message: 'File missing' })
  .build();
```

### 4. Расширенные типы сообщений

**Текущее:** Ограниченный набор типов

**Предложения:**
- [ ] Stream消息 (серверные события)
- [ ] Ping/Pong сообщения
- [ ] Batch сообщения (множественные задачи)
- [ ] Push notifications
- [ ] Typing indicator
- [ ] Message reactions

### 5. Сериализация

**Текущее:** Только JSON

**Предложения:**
- [ ] MessagePack для компактности
- [ ] Gzip compression для больших сообщений
- [ ] Schema versioning
- [ ] Backward/forward compatibility
- [ ] Binary protocol support

### 6. Производительность

**Текущее:** Синхронная обработка

**Предложения:**
- [ ] Object pooling для часто создаваемых сообщений
- [ ] Lazy serialization
- [ ] Immutable message objects
- [ ] Structural sharing для partial updates
- [ ] Freeze/unfreeze для safety

### 7. Message History

**Текущее:** Stateless — нет хранения истории

**Предложения:**
- [ ] Message history tracking
- [ ] Message diff (изменения между сообщениями)
- [ ] Message replay
- [ ] Undo/redo для сообщений

### 8. Интеграция с Context

**Текущее:** Частичная интеграция с context-parser

**Предложения:**
- [ ] Unified context builder
- [ ] Context templates
- [ ] Context validation
- [ ] Context merging

---

## API методы

### Существующие методы

```typescript
// Client Message Builders
function buildClientMessage(context: ContextBlock, files?: FileBlock[]): ClientMessage;
function buildNewTaskMessage(sessionId: string, tasks: string[], architecturalFeatures?: string[]): ClientMessage;
function buildContinueMessage(sessionId: string): ClientMessage;
function buildConfirmMessage(sessionId: string): ClientMessage;
function buildFileResponseMessage(sessionId: string, files: FileBlock[], context: ContextBlock): ClientMessage;

// Server Message Builders
function buildServerMessage(context: ContextBlock, options?: { files?: FileBlock[]; message?: string }): ServerMessage;
function buildFileRequestMessage(sessionId: string, paths: string[]): ServerMessage;
function buildTaskProgressMessage(sessionId: string, taskId: string, progress: number, status: TaskStatus | string): ServerMessage;
function buildErrorMessage(sessionId: string, code: string, message: string, file?: string, line?: number): ServerMessage;
function buildSessionCompleteMessage(sessionId: string, summary: string): ServerMessage;
function buildAckMessage(sessionId: string, message?: string): ServerMessage;
function buildNeuronActivationMessage(sessionId: string, activatedNeurons: string[], injectedContent?: string): ServerMessage;

// Validation
function isValidMessage(message: unknown): message is ClientMessage | ServerMessage;
function validateMessage(message: unknown): { valid: boolean; errors: string[] };
function isClientMessage(message: ClientMessage | ServerMessage): message is ClientMessage;
function isServerMessage(message: ClientMessage | ServerMessage): message is ServerMessage;

// Serialization
function serializeMessage(message: ClientMessage | ServerMessage): string;
function parseMessage(data: string): ClientMessage | ServerMessage;
function parseMessageSafe(data: string): ClientMessage | ServerMessage | null;

// Utilities
function getSessionId(message: ClientMessage | ServerMessage): string;
function cloneMessage<T extends ClientMessage | ServerMessage>(message: T): T;
function updateMessageContext<T extends ClientMessage | ServerMessage>(message: T, updates: Partial<ContextBlock>): T;

// Request API
function buildRequestContextBlock(options: RequestContextBlockOptions): RequestContextBlock;
function buildRequestApiResult(options: RequestApiResultOptions): RequestApiResult;
```

### Предлагаемые новые методы

```typescript
// Fluent API
class MessageBuilder<T extends ClientMessage | ServerMessage> {
  constructor(type: 'client' | 'server');
  sessionId(id: string): this;
  task(task: Task): this;
  tasks(tasks: Task[]): this;
  file(file: FileBlock): this;
  files(files: FileBlock[]): this;
  message(text: string): this;
  error(error: ErrorDetails): this;
  continue(flag: boolean): this;
  confirm(flag: boolean): this;
  custom(key: string, value: unknown): this;
  build(): T;
  buildClient(): ClientMessage;
  buildServer(): ServerMessage;
}

// Template Engine
interface MessageTemplate {
  id: string;
  type: 'client' | 'server';
  fields: TemplateField[];
  render(values: Record<string, unknown>): ClientMessage | ServerMessage;
}

function createTemplate(template: MessageTemplate): MessageTemplate;
function renderTemplate(templateId: string, values: Record<string, unknown>): ClientMessage | ServerMessage;
function registerTemplate(template: MessageTemplate): void;

// Extended Validation
function validateMessageSchema(message: unknown, schema: ZodSchema): ValidationResult;
function validateSessionId(sessionId: string): boolean;
function validateVersion(version: string): boolean;

// Extended Serialization
function serializeMessagePack(message: ClientMessage | ServerMessage): Buffer;
function deserializeMessagePack(data: Buffer): ClientMessage | ServerMessage;
function compressMessage(message: ClientMessage | ServerMessage): Buffer;
function decompressMessage(data: Buffer): ClientMessage | ServerMessage;

// Message History
function trackMessageHistory(message: ClientMessage | ServerMessage): string; // returns historyId
function getMessageHistory(historyId: string): Array<ClientMessage | ServerMessage>;
function diffMessages(original: ClientMessage | ServerMessage, modified: ClientMessage | ServerMessage): MessageDiff;

// Extended Types
interface StreamMessage {
  type: 'stream' | 'ping' | 'pong' | 'typing' | 'reaction';
  sessionId: string;
  data: unknown;
  timestamp: number;
}

interface BatchMessage {
  type: 'batch';
  messages: Array<ClientMessage | ServerMessage>;
  batchId: string;
}

// Error Codes
enum MessageErrorCode {
  INVALID_CONTEXT = 'INVALID_CONTEXT',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  INVALID_VERSION = 'INVALID_VERSION',
  INVALID_FILES = 'INVALID_FILES',
  INVALID_TASK = 'INVALID_TASK',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

---

## Зависимости

### Текущие зависимости

```json
{
  "dependencies": {
    "typescript": "^5.x"
  },
  "internal": {
    "../types/index.js": "ClientMessage, ServerMessage, ContextBlock, Task, FileBlock, RequestApiResult",
    "./context-parser.js": "createInitialContext, createNewTaskContext, createFileRequestContext, validateContextBlock"
  }
}
```

### Предлагаемые зависимости

```json
{
  "dependencies": {
    "zod": "^3.x", // Schema validation
    "uuid": "^9.x" // UUID generation/validation
  },
  "optional": {
    "msgpackr": "^1.x", // MessagePack serialization
    "pako": "^2.x", // Gzip compression
    "fast-json-patch": "^3.x" // JSON patch for diff
  }
}
```

---

## План развития

### Фаза 1: Базовая стабилизация ✅

- [x] Текущая реализация (валидация, парсинг, утилиты)
- [x] Type guards для всех типов
- [x] Safe версии методов
- [x] Client/Server message builders
- [x] Request API builders
- [x] JSON сериализация

### Фаза 2: Fluent API (1 неделя)

**Задачи:**
1. MessageBuilder class
2. Method chaining
3. Default values handling
4. Partial builders
5. Type-safe setters

**Файлы:**
- `a2a-server/src/protocol/message-builder.fluent.ts` — fluent API

### Фаза 3: Template Engine (1 неделя)

**Задачи:**
1. Template interface
2. Template registry
3. Variable interpolation
4. Conditional fields
5. Caching

**Файлы:**
- `a2a-server/src/protocol/message-builder.templates.ts` — templates

### Фаза 4: Enhanced Validation (1 неделя)

**Задачи:**
1. Zod schemas
2. Session ID validation
3. Version validation
4. Custom error codes
5. Dry-run validation

**Файлы:**
- `a2a-server/src/protocol/message-builder.validation.ts` — enhanced validation

### Фаза 5: Extended Types (1 неделя)

**Задачи:**
1. Stream messages
2. Batch messages
3. Ping/Pong
4. Typing indicators
5. Message reactions

**Файлы:**
- `a2a-server/src/protocol/message-builder.stream.ts` — streaming

### Фаза 6: Serialization (1 неделя)

**Задачи:**
1. MessagePack support
2. Gzip compression
3. Schema versioning
4. Backward compatibility
5. Binary protocol

**Файлы:**
- `a2a-server/src/protocol/message-builder.serialize.ts` — serialization

### Фаза 7: Performance & History (1 неделя)

**Задачи:**
1. Object pooling
2. Message history
3. Message diff
4. Structural sharing
5. Immutability helpers

**Файлы:**
- `a2a-server/src/protocol/message-builder.cache.ts` — caching
- `a2a-server/src/protocol/message-builder.history.ts` — history

---

## Примеры использования

### Базовое использование

```typescript
import { 
  buildClientMessage, 
  buildNewTaskMessage, 
  buildErrorMessage,
  validateMessage,
  serializeMessage 
} from './protocol/message-builder.js';

// Создание сообщения
const clientMsg = buildNewTaskMessage('session-123', ['task-1', 'task-2'], ['feature-1']);
console.log(clientMsg);

// Валидация
const result = validateMessage(rawMessage);
if (!result.valid) {
  console.error(result.errors);
}

// Сериализация
const json = serializeMessage(message);
```

### Fluent API (после Фазы 2)

```typescript
import { MessageBuilder } from './protocol/message-builder.fluent.js';

const message = new MessageBuilder('server')
  .sessionId('session-123')
  .task({ id: 'task-1', status: 'completed', progress: 100 })
  .message('Task completed successfully')
  .buildServer();
```

### Templates (после Фазы 3)

```typescript
import { createTemplate, renderTemplate } from './protocol/message-builder.templates.js';

const template = createTemplate({
  id: 'error-template',
  type: 'server',
  fields: [
    { key: 'session_id', required: true },
    { key: 'error_code', required: true },
    { key: 'error_message', required: true },
  ],
});

const message = renderTemplate('error-template', {
  session_id: 'session-123',
  error_code: 'FILE_NOT_FOUND',
  error_message: 'The requested file was not found',
});
```

### Enhanced Validation (после Фазы 4)

```typescript
import { validateMessageSchema } from './protocol/message-builder.validation.js';
import { MessageSchema } from './protocol/schemas/message.schema.js';

const result = validateMessageSchema(rawMessage, MessageSchema);
if (!result.valid) {
  console.log('Validation errors:', result.errors);
}
```

### Streaming (после Фазы 5)

```typescript
import { buildStreamMessage } from './protocol/message-builder.stream.js';

const stream = buildStreamMessage('session-123', {
  type: 'stream',
  data: { chunk: 'data', progress: 50 },
});
```
