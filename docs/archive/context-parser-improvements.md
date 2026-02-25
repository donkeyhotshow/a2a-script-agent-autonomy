# План: Context Parser (13KB)

## Текущее состояние

### Что делает парсер

**ContextParser** ([`a2a-server/src/protocol/context-parser.ts`](a2a-server/src/protocol/context-parser.ts)) — парсер и валидатор контекстных блоков согласно A2A протоколу. Обрабатывает входящие данные от клиента, выполняет валидацию структуры и преобразует сырые данные в типизированные объекты ContextBlock.

#### Основные функции:

1. **Валидация** — [`validateContextBlock()`](a2a-server/src/protocol/context-parser.ts:87)
   - Проверка версии протокола (только '1.0')
   - Валидация session_id (обязательное непустое поле)
   - Проверка типов всех полей: new_task, architectural_features, continue, confirm, tasks, request_files, errors
   - Возвращает объект с { valid: boolean, errors: string[] }

2. **Парсинг** — [`parseContextBlock()`](a2a-server/src/protocol/context-parser.ts:153)
   - Парсит сырые данные в типизированный ContextBlock
   - Выбрасывает Error с описанием ошибок валидации
   - [`parseContextBlockSafe()`](a2a-server/src/protocol/context-parser.ts:195) — безопасная версия (возвращает null)

3. **Функции извлечения**:
   - [`extractNewTask()`](a2a-server/src/protocol/context-parser.ts:210) — извлечение new_task
   - [`extractRequestedFiles()`](a2a-server/src/protocol/context-parser.ts:220) — извлечение request_files
   - [`extractArchitecturalFeatures()`](a2a-server/src/protocol/context-parser.ts:230) — извлечение architectural_features
   - [`parseTasks()`](a2a-server/src/protocol/context-parser.ts:240) — получить все tasks
   - [`hasContinueFlag()`](a2a-server/src/protocol/context-parser.ts:247) — флаг continue
   - [`hasConfirmFlag()`](a2a-server/src/protocol/context-parser.ts:254) — флаг confirm

4. **Создание и модификация контекста**:
   - [`createInitialContext()`](a2a-server/src/protocol/context-parser.ts:272) — создать начальный контекст
   - [`createNewTaskContext()`](a2a-server/src/protocol/context-parser.ts:282) — контекст с задачами
   - [`createFileRequestContext()`](a2a-server/src/protocol/context-parser.ts:303) — контекст с запросом файлов
   - [`updateTaskProgress()`](a2a-server/src/protocol/context-parser.ts:317) — обновить прогресс задачи
   - [`addTaskToContext()`](a2a-server/src/protocol/context-parser.ts:339) — добавить задачу
   - [`removeTaskFromContext()`](a2a-server/src/protocol/context-parser.ts:362) — удалить задачу
   - [`addErrorToContext()`](a2a-server/src/protocol/context-parser.ts:376) — добавить ошибку
   - [`clearErrorsFromContext()`](a2a-server/src/protocol/context-parser.ts:390) — очистить ошибки

5. **Сериализация**:
   - [`serializeContext()`](a2a-server/src/protocol/context-parser.ts:402) — в JSON строку
   - [`deserializeContext()`](a2a-server/src/protocol/context-parser.ts:409) — из JSON строки
   - [`deserializeContextSafe()`](a2a-server/src/protocol/context-parser.ts:421) — безопасная версия

6. **Утилиты**:
   - [`mergeContexts()`](a2a-server/src/protocol/context-parser.ts:436) — объединить контексты
   - [`cloneContext()`](a2a-server/src/protocol/context-parser.ts:451) — глубокое клонирование
   - [`hasActiveTasks()`](a2a-server/src/protocol/context-parser.ts:458) — есть активные задачи
   - [`getTaskById()`](a2a-server/src/protocol/context-parser.ts:468) — получить задачу по ID
   - [`getTasksByStatus()`](a2a-server/src/protocol/context-parser.ts:476) — получить задачи по статусу
   - [`calculateOverallProgress()`](a2a-server/src/protocol/context-parser.ts:484) — общий прогресс

#### Type Guards:

- [`isObject()`](a2a-server/src/protocol/context-parser.ts:23)
- [`isString()`](a2a-server/src/protocol/context-parser.ts:27)
- [`isStringArray()`](a2a-server/src/protocol/context-parser.ts:31)
- [`isBoolean()`](a2a-server/src/protocol/context-parser.ts:35)
- [`isValidTaskType()`](a2a-server/src/protocol/context-parser.ts:39)
- [`isValidTaskStatus()`](a2a-server/src/protocol/context-parser.ts:43)
- [`isTask()`](a2a-server/src/protocol/context-parser.ts:47)
- [`isTaskArray()`](a2a-server/src/protocol/context-parser.ts:60)
- [`isProtocolError()`](a2a-server/src/protocol/context-parser.ts:64)
- [`isProtocolErrorArray()`](a2a-server/src/protocol/context-parser.ts:76)

#### Типы данных:

```typescript
interface ContextBlock {
  version: '1.0';
  session_id: string;
  new_task?: string[];
  architectural_features?: string[];
  continue?: boolean;
  tasks?: Task[];
  request_files?: string[];
  confirm?: boolean;
  errors?: ProtocolError[];
}

interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  target?: string;
  progress?: number;
}

type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface ProtocolError {
  code: string;
  message: string;
  file?: string;
  line?: number;
}
```

#### Текущее использование:

- [`message.service.ts`](a2a-server/src/services/message.service.ts) — парсинг входящих сообщений
- [`protocol.router.ts`](a2a-server/src/protocol/protocol.router.ts) — валидация контекста
- Где используется в коде: search_and_replace запросы, создание задач, обработка ошибок

---

## Возможности для улучшения

### 1. Расширенная валидация

**Текущее:** Базовые проверки типов

**Предложения:**
- [x] Схема валидации с Zod для всех полей
- [x] Кастомные валидаторы (email в session_id, URL в request_files)
- [x] Валидация вложенных структур (deep validation)
- [x] Graceful degradation — частичная валидация
- [x] Валидация размера данных (max array length, max string length)

### 2. Поддержка версионирования

**Текущее:** Жёстко зашитая версия '1.0'

**Предложения:**
- [x] Поддержка нескольких версий протокола
- [x] Migration функции между версиями
- [x] Detect и warning при использовании устаревшей версии
- [x] Version negotiator

### 3. Расширенные типы задач

**Текущее:** Фиксированный набор TaskType

**Предложения:**
- [x] Кастомные типы задач
- [x] metadata для задач
- [x] dependencies между задачами (граф задач)
- [x] Sub-tasks (иерархия)
- [x] Планирование задач (scheduled tasks)

### 4. Контекстные функции

**Текущее:** Ограниченный набор полей

**Предложения:**
- [x] History/context timeline
- [x] State machine для контекста
- [x] Parent-child relationships
- [x] Workspace context (проект, файлы, директории)
- [x] User preferences в контексте

### 5. Производительность

**Текущее:** Синхронная валидация

**Предложения:**
- [x] Кэширование результатов валидации
- [x] LRU cache для парсинга
- [x] Lazy validation (по требованию)
- [x] Web Workers для тяжёлых операций

### 6. Error Handling

**Текущее:** Базовые ошибки

**Предложения:**
- [x] Typed errors (ContextError с кодами)
- [x] Error recovery strategies
- [x] Error aggregation (все ошибки, не только первая)
- [x] Error localization

### 7. Сериализация

**Текущее:** Только JSON

**Предложения:**
- [x] MessagePack / CBOR для компактности
- [x] Compression (gzip)
- [x] Streaming serialization для больших контекстов
- [x] Schema evolution (backward compatibility)

### 8. Дополнительные утилиты

**Текущее:** Базовые операции

**Предложения:**
- [x] Diff контекстов (что изменилось)
- [x] Patch контекста (применить изменения)
- [x] Context events (listeners на изменения)
- [x] Undo/redo для контекста

---

## API методы

### Существующие методы

```typescript
// Валидация
function validateContextBlock(context: unknown): { valid: boolean; errors: string[] };

// Парсинг
function parseContextBlock(data: unknown): ContextBlock;
function parseContextBlockSafe(data: unknown): ContextBlock | null;

// Извлечение
function extractNewTask(context: ContextBlock): string[] | null;
function extractRequestedFiles(context: ContextBlock): string[] | null;
function extractArchitecturalFeatures(context: ContextBlock): string[] | null;
function parseTasks(context: ContextBlock): Task[];
function hasContinueFlag(context: ContextBlock): boolean;
function hasConfirmFlag(context: ContextBlock): boolean;

// Создание
function createInitialContext(sessionId: string): ContextBlock;
function createNewTaskContext(sessionId: string, tasks: string[], architecturalFeatures?: string[]): ContextBlock;
function createFileRequestContext(sessionId: string, paths: string[]): ContextBlock;

// Модификация
function updateTaskProgress(context: ContextBlock, taskId: string, progress: number, status: TaskStatus): ContextBlock;
function addTaskToContext(context: ContextBlock, type: TaskType, target?: string): ContextBlock;
function removeTaskFromContext(context: ContextBlock, taskId: string): ContextBlock;
function addErrorToContext(context: ContextBlock, error: ProtocolError): ContextBlock;
function clearErrorsFromContext(context: ContextBlock): ContextBlock;

// Сериализация
function serializeContext(context: ContextBlock): string;
function deserializeContext(data: string): ContextBlock;
function deserializeContextSafe(data: string): ContextBlock | null;

// Утилиты
function mergeContexts(base: ContextBlock, override: Partial<ContextBlock>): ContextBlock;
function cloneContext(context: ContextBlock): ContextBlock;
function hasActiveTasks(context: ContextBlock): boolean;
function getTaskById(context: ContextBlock, taskId: string): Task | null;
function getTasksByStatus(context: ContextBlock, status: TaskStatus): Task[];
function calculateOverallProgress(context: ContextBlock): number;
```

### Предлагаемые новые методы

```typescript
// Версионирование
function validateWithVersion(context: unknown, version: string): ValidationResult;
function migrateContext(context: ContextBlock, fromVersion: string, toVersion: string): ContextBlock;
function getSupportedVersions(): string[];

// Расширенная валидация
function validateDeep(context: unknown): ValidationResult;
function validatePartial(context: unknown, fields: string[]): ValidationResult;

// Граф задач
function addTaskDependency(context: ContextBlock, taskId: string, dependsOn: string): ContextBlock;
function getTaskDependencies(context: ContextBlock, taskId: string): string[];
function getTopologicalOrder(context: ContextBlock): Task[];

// History
function addToHistory(context: ContextBlock, event: ContextEvent): ContextBlock;
function getHistory(context: ContextBlock): ContextEvent[];
function undo(context: ContextBlock): ContextBlock | null;
function redo(context: ContextBlock): ContextBlock | null;

// Diff & Patch
function diffContexts(oldCtx: ContextBlock, newCtx: ContextBlock): ContextDiff;
function patchContext(base: ContextBlock, diff: ContextDiff): ContextBlock;

// Сериализация
function serializeCompressed(context: ContextBlock): Buffer;
function deserializeCompressed(data: Buffer): ContextBlock;

// Typed Errors
class ContextError extends Error {
  code: ContextErrorCode;
  details: Record<string, unknown>;
  field?: string;
}

enum ContextErrorCode {
  INVALID_VERSION = 'INVALID_VERSION',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  INVALID_FIELD = 'INVALID_FIELD',
  PARSE_ERROR = 'PARSE_ERROR',
  SERIALIZE_ERROR = 'SERIALIZE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

// Types
interface ValidationResult {
  valid: boolean;
  errors: ContextError[];
  warnings: string[];
}

interface ContextDiff {
  added: Partial<ContextBlock>;
  removed: string[];
  changed: Record<string, { old: unknown; new: unknown }>;
}

interface ContextEvent {
  type: 'task_added' | 'task_removed' | 'task_updated' | 'error_added' | 'field_changed';
  timestamp: Date;
  data: unknown;
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
    "../types/index.js": "ContextBlock, Task, TaskType, TaskStatus, ProtocolError"
  }
}
```

### Предлагаемые зависимости

```json
{
  "dependencies": {
    "zod": "^3.x", // Валидация
    "fast-json-patch": "^3.x", // JSON Patch (RFC 6902)
    "lodash": "^4.x", // Утилиты (clonedeep, merge)
    "uuid": "^9.x" // ID генерация
  },
  "optional": {
    "msgpackr": "^1.x", // MessagePack сериализация
    "pako": "^2.x", // Gzip compression
    "ajv": "^8.x" // JSON Schema валидация (альтернатива Zod)
  }
}
```

---

## План развития

### Фаза 1: Базовая стабилизация ✅

- [x] Текущая реализация (валидация, парсинг, утилиты)
- [x] Type guards для всех типов
- [x] Safe версии методов (возвращают null)
- [x] Сериализация JSON

### Фаза 2: Расширенная валидация (1 неделя)

**Задачи:**
1. Zod схемы для ContextBlock
2. Typed errors с кодами
3. Валидация размера данных
4. Graceful degradation

**Файлы:**
- `a2a-server/src/protocol/context-parser.validator.ts` — Zod схемы
- `a2a-server/src/protocol/context-parser.errors.ts` — typed errors

### Фаза 3: Версионирование (1 неделя)

**Задачи:**
1. Поддержка версий протокола
2. Migration функции
3. Version detector

**Файлы:**
- `a2a-server/src/protocol/context-parser.versions.ts` — версионирование

### Фаза 4: Граф задач (1 неделя)

**Задачи:**
1. Dependencies между задачами
2. Topological sort
3. Циклические зависимости detection

**Файлы:**
- `a2a-server/src/protocol/context-parser.tasks.ts` — управление задачами

### Фаза 5: History и Undo/Redo (1 неделя)

**Задачи:**
1. Event history
2. Undo/redo стек
3. Context events listeners

**Файлы:**
- `a2a-server/src/protocol/context-parser.history.ts` — история

### Фаза 6: Производительность (1 неделя)

**Задачи:**
1. LRU cache для валидации
2. MessagePack сериализация
3. Compression

**Файлы:**
- `a2a-server/src/protocol/context-parser.cache.ts` — кэширование
- `a2a-server/src/protocol/context-parser.compress.ts` — компрессия

### Фаза 7: Diff & Patch (1 неделя)

**Задачи:**
1. Context diff
2. JSON Patch integration
3. Patch application

**Файлы:**
- `a2a-server/src/protocol/context-parser.diff.ts` — diff/patch

---

## Примеры использования

### Базовое использование

```typescript
import { parseContextBlock, validateContextBlock, createInitialContext } from './protocol/context-parser.js';

// Валидация
const result = validateContextBlock(rawData);
if (!result.valid) {
  console.error(result.errors);
}

// Парсинг
const context = parseContextBlock(rawData);
console.log(context.session_id);

// Создание контекста
const ctx = createNewTaskContext('session-123', ['fix bug', 'add test']);
```

### С Zod валидацией (после Фазы 2)

```typescript
import { validateContextBlockZod, ContextBlockSchema } from './protocol/context-parser.validator.js';

const result = validateContextBlockZod(rawData);
if (!result.success) {
  console.error(result.error.issues);
}
const context = result.data;
```

### С историей (после Фазы 5)

```typescript
import { addToHistory, undo, redo } from './protocol/context-parser.history.js';

let context = createInitialContext('session-1');
context = addTaskToContext(context, 'create', 'file.ts');
context = addToHistory(context, { type: 'task_added', timestamp: new Date(), data: {...} });

const previous = undo(context);
const next = redo(context);
```

### С Diff (после Фазы 7)

```typescript
import { diffContexts, patchContext } from './protocol/context-parser.diff.js';

const diff = diffContexts(oldContext, newContext);
const patched = patchContext(baseContext, diff);
```

---

## Критерии успеха

1. **Валидация**: Все ошибки возвращаются с кодами, не только первая
2. **Производительность**: Время валидации < 1ms для типичного контекста
3. **Совместимость**: Migration между версиями работает корректно
4. **Надёжность**: Undo/redo работает для всех операций

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сложность графа задач | Средняя | Среднее | Простая реализация без циклов |
| Cache invalidation | Средняя | Среднее | TTL + manual invalidation |
| Migration breaking changes | Низкая | Высокое | Тесты для каждой версии |
| Size overhead (history) | Средняя | Низкое | Limit history size |

---

**Дата:** 2026-02-24  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~13KB (включая все предложения)
