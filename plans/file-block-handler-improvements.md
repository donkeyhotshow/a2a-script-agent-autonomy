# План: File Block Handler (14KB)

## Текущее состояние

### Что делает обработчик файлов

**FileBlockHandler** ([`a2a-server/src/protocol/file-block-handler.ts`](a2a-server/src/protocol/file-block-handler.ts)) — обработчик файловых блоков согласно A2A протоколу. Выполняет парсинг, валидацию, разбиение на чанки и diff операции для файловых данных.

#### Основные функции:

1. **Определение языка** — [`detectLanguage()`](a2a-server/src/protocol/file-block-handler.ts:37)
   - Карта расширений к языкам (php, vue, javascript, typescript, json, markdown, css, scss, html, xml, yaml, sql, bash, dotenv, plaintext)
   - Поддержка мульти-расширений (.blade.php, .d.ts)
   - Возвращает идентификатор языка для подсветки синтаксиса

2. **Валидация** — [`validateFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:68)
   - Проверка path (обязательное непустое поле)
   - Проверка content (обязательное поле)
   - Валидация startLine/endLine (положительные числа)
   - Проверка согласованности диапазона (startLine <= endLine)
   - Возвращает объект с { valid: boolean, errors: string[] }

3. **Парсинг** — [`parseFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:122)
   - Парсит сырые данные в типизированный FileBlock
   - Выбрасывает Error с описанием ошибок валидации
   - [`parseFileBlockSafe()`](a2a-server/src/protocol/file-block-handler.ts:164) — безопасная версия (возвращает null)
   - [`parseFileBlocks()`](a2a-server/src/protocol/file-block-handler.ts:149) — массив блоков

4. **Создание блоков**:
   - [`createFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:179) — создать блок из контента
   - [`createFileBlockRequest()`](a2a-server/src/protocol/file-block-handler.ts:202) — создать запрос на файл

5. **Операции со строками**:
   - [`extractLines()`](a2a-server/src/protocol/file-block-handler.ts:226) — извлечь диапазон строк
   - [`getLineCount()`](a2a-server/src/protocol/file-block-handler.ts:241) — получить количество строк
   - [`getLine()`](a2a-server/src/protocol/file-block-handler.ts:248) — получить строку по номеру (1-indexed)

6. **Разбиение на чанки (Chunking)**:
   - [`chunkFile()`](a2a-server/src/protocol/file-block-handler.ts:266) — разбить контент на чанки по maxLines
   - [`chunkFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:291) — разбить блок на чанки с сохранением метаданных

7. **Объединение блоков** — [`mergeFileBlocks()`](a2a-server/src/protocol/file-block-handler.ts:312)
   - Объединяет несколько блоков одного файла
   - Сортирует по startLine
   - Заполняет пробелы пустыми строками

8. **Diff операции**:
   - [`diffFileBlocks()`](a2a-server/src/protocol/file-block-handler.ts:376) — вычислить diff между оригиналом и модификацией
   - [`applyDiff()`](a2a-server/src/protocol/file-block-handler.ts:416) — применить diff к блоку
   - Типы изменений: add, delete, modify
   - Возвращает количество добавлений/удалений и массив изменений

9. **Сериализация**:
   - [`serializeFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:452) — в JSON строку
   - [`deserializeFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:459) — из JSON строки
   - [`deserializeFileBlockSafe()`](a2a-server/src/protocol/file-block-handler.ts:473) — безопасная версия

10. **Утилиты**:
    - [`getFileExtension()`](a2a-server/src/protocol/file-block-handler.ts:488) — получить расширение
    - [`getFileName()`](a2a-server/src/protocol/file-block-handler.ts:499) — получить имя файла
    - [`getDirectory()`](a2a-server/src/protocol/file-block-handler.ts:507) — получить директорию
    - [`isBinaryFile()`](a2a-server/src/protocol/file-block-handler.ts:515) — проверить бинарный файл по расширению
    - [`getFileSize()`](a2a-server/src/protocol/file-block-handler.ts:532) — размер в байтах
    - [`truncateFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:539) — обрезать до maxBytes
    - [`cloneFileBlock()`](a2a-server/src/protocol/file-block-handler.ts:564) — глубокое клонирование

#### Типы данных:

```typescript
interface FileBlock {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

interface FileBlockRequest {
  path: string;
  startLine?: number;
  endLine?: number;
}

interface DiffChange {
  line: number;
  type: 'add' | 'delete' | 'modify';
  content: string;
}

interface DiffResult {
  additions: number;
  deletions: number;
  changes: DiffChange[];
}
```

#### Текущее использование:

- [`message.service.ts`](a2a-server/src/services/message.service.ts) — обработка файловых блоков в сообщениях
- [`protocol.router.ts`](a2a-server/src/protocol/protocol.router.ts) — валидация файловых данных
- Где используется в коде: передача файлов, diff операции, разбиение больших файлов

---

## Возможности для улучшения

### 1. Расширенная валидация

**Текущее:** Базовые проверки типов

**Предложения:**
- [ ] Схема валидации с Zod для FileBlock
- [ ] Валидация path (существующий файл, безопасный путь)
- [ ] Валидация content (max size, encoding)
- [ ] Валидация encoding (utf8, base64)
- [ ] Проверка на circular references
- [ ] Max line length validation

### 2. Интеллектуальное разбиение (Smart Chunking)

**Текущее:** Простое разбиение по строкам

**Предложения:**
- [ ] Semantic chunking (по функциям, классам)
- [ ] Context-aware chunking (учитывать контекст вокруг чанка)
- [ ] Adaptive chunking (размер чанка зависит от типа файла)
- [ ] Overlapping chunks (перекрывающиеся чанки для контекста)
- [ ] Smart boundary detection (границы по синтаксису)

### 3. Улучшенные Diff операции

**Текущее:** Простой построчный diff

**Предложения:**
- [ ] Unified diff format (традиционный diff)
- [ ] Side-by-side diff
- [ ] Word-level diff
- [ ] Character-level diff для похожих строк
- [ ] Ignore whitespace options
- [ ] Ignore case options
- [ ] Diff statistics (процент изменений)
- [ ] Three-way merge для конфликтов

### 4. Поддержка бинарных файлов

**Текущее:** Определение бинарных файлов по расширению

**Предложения:**
- [ ] Base64 encoding/decoding для бинарников
- [ ] Chunked binary transfer
- [ ] Binary diff (для изображений, etc.)
- [ ] Streaming upload/download
- [ ] Progress callbacks

### 5. Интеграция с файловой системой

**Текущее:** Только in-memory операции

**Предложения:**
- [ ] Read file from disk
- [ ] Write file to disk
- [ ] Watch file changes
- [ ] Atomic writes
- [ ] Backup before write
- [ ] File locking

### 6. Производительность

**Текущее:** Синхронная обработка

**Предложения:**
- [ ] LRU cache для результатов diff
- [ ] Web Workers для тяжёлых операций
- [ ] Streaming processing для больших файлов
- [ ] Incremental diff (только изменения)
- [ ] Parallel chunking (multithread)

### 7. Расширенные утилиты

**Текущее:** Базовые операции

**Предложения:**
- [ ] File hashing (MD5, SHA256)
- [ ] Line ending normalization (LF/CRLF)
- [ ] Whitespace normalization
- [ ] Tab/space conversion
- [ ] Encoding detection
- [ ] BOM handling

### 8. Сериализация

**Текущее:** Только JSON

**Предложения:**
- [ ] MessagePack для компактности
- [ ] Gzip compression
- [ ] Streaming serialization
- [ ] Schema evolution
- [ ] Delta encoding (только изменения)

---

## API методы

### Существующие методы

```typescript
// Определение языка
function detectLanguage(path: string): string;

// Валидация
function validateFileBlock(block: unknown): { valid: boolean; errors: string[] };

// Парсинг
function parseFileBlock(data: unknown): FileBlock;
function parseFileBlockSafe(data: unknown): FileBlock | null;
function parseFileBlocks(data: unknown[]): FileBlock[];

// Создание
function createFileBlock(path: string, content: string, options?: { startLine?: number; endLine?: number }): FileBlock;
function createFileBlockRequest(path: string, startLine?: number, endLine?: number): FileBlockRequest;

// Операции со строками
function extractLines(block: FileBlock, startLine: number, endLine: number): string;
function getLineCount(block: FileBlock): number;
function getLine(block: FileBlock, lineNumber: number): string | null;

// Chunking
function chunkFile(content: string, maxLines: number): Array<{ startLine: number; endLine: number; content: string }>;
function chunkFileBlock(block: FileBlock, maxLines: number): FileBlock[];

// Merge
function mergeFileBlocks(blocks: FileBlock[]): FileBlock;

// Diff
function diffFileBlocks(original: FileBlock, modified: FileBlock): DiffResult;
function applyDiff(block: FileBlock, diff: DiffChange[]): FileBlock;

// Сериализация
function serializeFileBlock(block: FileBlock): string;
function deserializeFileBlock(data: string): FileBlock;
function deserializeFileBlockSafe(data: string): FileBlock | null;

// Утилиты
function getFileExtension(path: string): string;
function getFileName(path: string): string;
function getDirectory(path: string): string;
function isBinaryFile(path: string): boolean;
function getFileSize(block: FileBlock): number;
function truncateFileBlock(block: FileBlock, maxBytes: number): FileBlock;
function cloneFileBlock(block: FileBlock): FileBlock;
```

### Предлагаемые новые методы

```typescript
// Semantic Chunking
function chunkFileSemantic(content: string, options: ChunkOptions): FileBlock[];
interface ChunkOptions {
  maxLines?: number;
  includeContext?: number; // строк контекста вокруг
  respectStructure?: boolean; // не разрывать функции/классы
  overlap?: number; // перекрытие чанков
}

// Enhanced Diff
function diffFileBlocksUnified(original: FileBlock, modified: FileBlock, context?: number): string;
function diffFileBlocksSideBySide(original: FileBlock, modified: FileBlock): SideBySideDiff;
function diffFileBlocksWordLevel(original: FileBlock, modified: FileBlock): WordDiffResult;

interface SideBySideDiff {
  left: DiffLine[];
  right: DiffLine[];
}

interface WordDiffResult {
  changes: WordChange[];
}

// Binary Support
function encodeBinary(content: Buffer): string; // base64
function decodeBinary(encoded: string): Buffer;
function isBinaryFileMagic(bytes: Buffer): boolean;

// File System Integration
async function readFileBlockFromDisk(path: string, options?: FileReadOptions): Promise<FileBlock>;
async function writeFileBlockToDisk(block: FileBlock, options?: FileWriteOptions): Promise<void>;
function watchFile(path: string, callback: (event: FileEvent) => void): FileWatcher;

interface FileReadOptions {
  encoding?: BufferEncoding;
  maxSize?: number;
}

interface FileWriteOptions {
  backup?: boolean;
  atomic?: boolean;
}

// Extended Utilities
function normalizeLineEndings(content: string, target: 'lf' | 'crlf'): string;
function normalizeWhitespace(content: string): string;
function detectEncoding(buffer: Buffer): string;
function getFileHash(block: FileBlock, algorithm: 'md5' | 'sha256'): string;

// Merge
function mergeFileBlocks3Way(base: FileBlock, local: FileBlock, remote: FileBlock): MergeResult;
interface MergeResult {
  content: string;
  conflicts: MergeConflict[];
}

// Typed Errors
class FileBlockError extends Error {
  code: FileBlockErrorCode;
  details: Record<string, unknown>;
}

enum FileBlockErrorCode {
  INVALID_PATH = 'INVALID_PATH',
  INVALID_CONTENT = 'INVALID_CONTENT',
  INVALID_LINE_RANGE = 'INVALID_LINE_RANGE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  READ_ERROR = 'READ_ERROR',
  WRITE_ERROR = 'WRITE_ERROR',
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  ENCODING_ERROR = 'ENCODING_ERROR',
}
```

---

## Зависимости

### Текущие зависимости

```json
{
  "dependencies": {
    "typescript": "^5.x",
    "buffer": "node built-in"
  },
  "internal": {
    "../types/index.js": "FileBlock, FileBlockRequest"
  }
}
```

### Предлагаемые зависимости

```json
{
  "dependencies": {
    "diff": "^5.x", // Улучшенные diff операции
    "zod": "^3.x", // Валидация
    "xxhash-wasm": "^1.x", // Быстрое хеширование
    "iconv-lite": "^0.6.x", // Encoding detection/conversion
    "chardet": "^1.x" // Encoding detection
  },
  "optional": {
    "msgpackr": "^1.x", // MessagePack сериализация
    "pako": "^2.x", // Gzip compression
    "diff-match-patch": "^1.x", // Google's diff-match-patch
    "semver": "^7.x" // Версионирование
  }
}
```

---

## План развития

### Фаза 1: Базовая стабилизация ✅

- [x] Текущая реализация (валидация, парсинг, утилиты)
- [x] Type guards для всех типов
- [x] Safe версии методов
- [x] Diff операции
- [x] Chunking
- [x] Сериализация JSON

### Фаза 2: Semantic Chunking (1 неделя)

**Задачи:**
1. Функция semantic chunking
2. Опции для настройки чанкинга
3. Respect structure (не разрывать функции)
4. Overlapping chunks

**Файлы:**
- `a2a-server/src/protocol/file-block-handler.semantic-chunk.ts` — семантический чанкинг

### Фаза 3: Enhanced Diff (1 неделя)

**Задачи:**
1. Unified diff format
2. Word-level diff
3. Three-way merge
4. Diff statistics

**Файлы:**
- `a2a-server/src/protocol/file-block-handler.diff.ts` — расширенные diff

### Фаза 4: Binary Support (1 неделя)

**Задачи:**
1. Base64 encoding
2. Binary detection (magic bytes)
3. Chunked binary transfer

**Файлы:**
- `a2a-server/src/protocol/file-block-handler.binary.ts` — бинарные файлы

### Фаза 5: File System Integration (1 неделя)

**Задачи:**
1. Read/write from disk
2. File watching
3. Atomic writes с backup

**Файлы:**
- `a2a-server/src/protocol/file-block-handler.fs.ts` — файловая система

### Фаза 6: Производительность (1 неделя)

**Задачи:**
1. LRU cache для diff
2. Web Workers для тяжёлых операций
3. Streaming processing
4. Parallel chunking

**Файлы:**
- `a2a-server/src/protocol/file-block-handler.cache.ts` — кэширование

### Фаза 7: Advanced Utilities (1 неделя)

**Задачи:**
1. Encoding detection
2. Line ending normalization
3. File hashing
4. Delta encoding

**Файлы:**
- `a2a-server/src/protocol/file-block-handler.encoding.ts` — кодировки
- `a2a-server/src/protocol/file-block-handler.delta.ts` — delta encoding

---

## Примеры использования

### Базовое использование

```typescript
import { parseFileBlock, validateFileBlock, createFileBlock, chunkFileBlock } from './protocol/file-block-handler.js';

// Валидация
const result = validateFileBlock(rawData);
if (!result.valid) {
  console.error(result.errors);
}

// Парсинг
const block = parseFileBlock(rawData);
console.log(block.path);

// Разбиение на чанки
const chunks = chunkFileBlock(largeBlock, 1000);
```

### Semantic Chunking (после Фазы 2)

```typescript
import { chunkFileSemantic } from './protocol/file-block-handler.semantic-chunk.js';

const chunks = chunkFileSemantic(content, {
  maxLines: 500,
  respectStructure: true,
  overlap: 10,
});
```

### Enhanced Diff (после Фазы 3)

```typescript
import { diffFileBlocksUnified, mergeFileBlocks3Way } from './protocol/file-block-handler.diff.js';

const diff = diffFileBlocksUnified(original, modified, 3);
console.log(diff);

const merge = mergeFileBlocks3Way(base, local, remote);
if (merge.conflicts.length > 0) {
  console.log('Conflicts:', merge.conflicts);
}
```

### File System Integration (после Фазы 5)

```typescript
import { readFileBlockFromDisk, writeFileBlockToDisk } from './protocol/file-block-handler.fs.js';

const block = await readFileBlockFromDisk('./src/app.ts');
await writeFileBlockToDisk(block, { backup: true });
```

---

## Критерии успеха

1. **Валидация**: Все ошибки с кодами, безопасные пути
2. **Производительность**: Diff < 100ms для файлов до 10K строк
3. **Функциональность**: Semantic chunking сохраняет структуру кода
4. **Совместимость**: Merge конфликты корректно обрабатываются

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Semantic chunking сложность | Средняя | Среднее | Начать с простых границ (функции, классы) |
| Binary detection accuracy | Средняя | Среднее | Magic bytes + extension fallback |
| Memory usage при large files | Высокая | Высокое | Streaming + chunked processing |
| Merge conflicts complexity | Средняя | Высокое | Простой three-way merge |

---

**Дата:** 2026-02-24  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~14KB (включая все предложения)
