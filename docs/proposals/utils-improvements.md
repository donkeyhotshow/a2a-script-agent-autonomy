# План: Utils (a2a-server)

## Текущее состояние

### Что делает модуль

**Utils** ([`a2a-server/src/utils/`](a2a-server/src/utils)) — набор вспомогательных утилит общего назначения для
криптографии, логирования, валидации и анализа задач. Используются throughout приложения для типовых операций.

#### Текущие утилиты:

1. **[`crypto.ts`](a2a-server/src/utils/crypto.ts:1)** — Криптографические операции
    - [`encrypt()`](a2a-server/src/utils/crypto.ts:16) — шифрование данных (AES-256-GCM)
    - [`decrypt()`](a2a-server/src/utils/crypto.ts:28) — дешифрование данных
    - [`generateRandomString()`](a2a-server/src/utils/crypto.ts:42) — генерация случайной строки
    - [`generateUuid()`](a2a-server/src/utils/crypto.ts:49) — генерация UUID v4
    - [`hashSha256()`](a2a-server/src/utils/crypto.ts:56) — хеширование SHA-256
    - [`generateHmac()`](a2a-server/src/utils/crypto.ts:63) — генерация HMAC
    - [`verifyHmac()`](a2a-server/src/utils/crypto.ts:71) — верификация HMAC
    - [`generateApiKey()`](a2a-server/src/utils/crypto.ts:79) — генерация API ключа
    - [`hashPassword()`](a2a-server/src/utils/crypto.ts:86) — хеширование пароля (bcrypt)
    - [`verifyPassword()`](a2a-server/src/utils/crypto.ts:94) — верификация пароля
    - [`constantTimeCompare()`](a2a-server/src/utils/crypto.ts:102) — constant-time сравнение строк

2. **[`logger.ts`](a2a-server/src/utils/logger.ts:1)** — Логирование
    - [`logger`](a2a-server/src/utils/logger.ts:21) — основной экземпляр Winston
    - [`log`](a2a-server/src/utils/logger.ts:49) — удобные методы (info, error, warn, debug)

3. **[`task-detail-analyzer.ts`](a2a-server/src/utils/task-detail-analyzer.ts:1)** — Анализ задач
    - [`analyzeTaskDetail()`](a2a-server/src/utils/task-detail-analyzer.ts:62) — определение уровня детализации задачи
    - [`getNeuronsByLevel()`](a2a-server/src/utils/task-detail-analyzer.ts:184) — получение рекомендуемых нейронов
    - Типы: [`TaskDetailLevel`](a2a-server/src/utils/task-detail-analyzer.ts:6), [
      `TaskAnalysisResult`](a2a-server/src/utils/task-detail-analyzer.ts:8)

4. **[`validation.ts`](a2a-server/src/utils/validation.ts:1)** — Валидация и схемы Zod
    - Схемы: [`uuidSchema`](a2a-server/src/utils/validation.ts:11), [
      `emailSchema`](a2a-server/src/utils/validation.ts:16), [
      `passwordSchema`](a2a-server/src/utils/validation.ts:21), [
      `gitUrlSchema`](a2a-server/src/utils/validation.ts:30), [
      `branchNameSchema`](a2a-server/src/utils/validation.ts:38), [
      `filePathSchema`](a2a-server/src/utils/validation.ts:49), [
      `paginationSchema`](a2a-server/src/utils/validation.ts:57)
    - Input схемы: [`registerInputSchema`](a2a-server/src/utils/validation.ts:79), [
      `loginInputSchema`](a2a-server/src/utils/validation.ts:88), [
      `createProjectInputSchema`](a2a-server/src/utils/validation.ts:103), [
      `createSessionInputSchema`](a2a-server/src/utils/validation.ts:114), [
      `searchQuerySchema`](a2a-server/src/utils/validation.ts:121)
    - Утилиты: [`validateInput()`](a2a-server/src/utils/validation.ts:140), [
      `isValidJson()`](a2a-server/src/utils/validation.ts:147), [
      `sanitizeString()`](a2a-server/src/utils/validation.ts:159), [
      `isValidFileExtension()`](a2a-server/src/utils/validation.ts:166), [
      `isValidMimeType()`](a2a-server/src/utils/validation.ts:177)

#### Архитектура:

- Stateless утилиты без состояния
- Используют Node.js crypto модуль для криптографии
- Winston для structured логирования
- Zod для type-safe валидации
- Чистые функции (pure functions) где возможно

---

## Возможности для улучшения

### 1. Crypto

**Текущее:** Базовые крипто операции, использует jwtSecret как fallback для encryption key

**Предложения:**

- [ ] Выделенный ENCRYPTION_KEY с валидацией (32 символа)
- [ ] Key rotation механизм
- [ ] Key derivation function (PBKDF2/Argon2)
- [ ] Шифрование файлов (streaming)
  - [ ]数字签名 (digital signatures)
- [ ] AES-512-GCM опция
- [ ] Entropy проверка для паролей

### 2. Logger

**Текущее:** Winston с базовой конфигурацией, file transport только в production

**Предложения:**
- [ ]Structured logging (JSON) для production

- [ ] Log rotation (daily/weekly)
- [ ] Log levels по модулям
- [ ] Custom transports ( Elasticsearch, Datadog)
- [ ] Request/response logging middleware
- [ ] Performance logging
- [ ] Audit logging для security events
- [ ] Colorized output для development

### 3. Task Detail Analyzer

**Текущее:** Простой keyword-based анализ, ограниченный набор technical terms

**Предложения:**

- [ ] Расширенный набор technical terms
- [ ] ML-based classification
- [ ] Context-aware анализ (project structure)
- [ ] Language detection
- [ ] Complexity scoring
- [ ] Confidence level для результата
- [ ] Extensible neuron registry

### 4. Validation

**Текущее:** Базовые Zod схемы, ограниченные возможности

**Предложения:**

- [ ] Сложные составные схемы (project, session, request)
- [ ] Async валидаторы (database check)
- [ ] Custom error formatters
- [ ] Schema versioning
- [ ] Conditional validation
- [ ] Partial validation (required vs optional)
- [ ] Валидация для A2A protocol messages
- [ ] Sanitization utilities

### 5. Новые утилиты

**Предложения:**

- [ ] Date/time utilities (format, parse, timezone)
- [ ] Object utilities (deep merge, clone, diff)
- [ ] String utilities (truncate, slugify, camelCase)
- [ ] Array utilities (unique, chunk, flatten)
- [ ] Retry/backoff utilities
- [ ] Rate limiter utilities
- [ ] Cache utilities
- [ ] HTTP utilities (query params, headers)

---

## API / Функции

### Crypto

| Функция                | Параметры                     | Описание               | Возвращает       |
|------------------------|-------------------------------|------------------------|------------------|
| `encrypt`              | text: string                  | Шифрование AES-256-GCM | string (base64)  |
| `decrypt`              | encryptedData: string         | Дешифрование           | string           |
| `generateRandomString` | length?: number               | Случайная hex строка   | string           |
| `generateUuid`         | -                             | UUID v4                | string           |
| `hashSha256`           | text: string                  | SHA-256 хеш            | string (hex)     |
| `generateHmac`         | data: string, secret?: string | HMAC-SHA256            | string (hex)     |
| `verifyHmac`           | data, hmac, secret            | Верификация HMAC       | boolean          |
| `generateApiKey`       | prefix?: string               | API key генерация      | string           |
| `hashPassword`         | password: string              | bcrypt хеширование     | Promise<string>  |
| `verifyPassword`       | password, hash                | bcrypt верификация     | Promise<boolean> |
| `constantTimeCompare`  | a: string, b: string          | Constant-time compare  | boolean          |

### Logger

| Функция     | Параметры      | Описание                | Возвращает |
|-------------|----------------|-------------------------|------------|
| `logger`    | -              | Winston logger instance | Logger     |
| `log.info`  | message, meta? | Info level              | void       |
| `log.error` | message, meta? | Error level             | void       |
| `log.warn`  | message, meta? | Warning level           | void       |
| `log.debug` | message, meta? | Debug level             | void       |

### Task Detail Analyzer

| Функция             | Параметры              | Описание              | Возвращает         |
|---------------------|------------------------|-----------------------|--------------------|
| `analyzeTaskDetail` | taskText: string       | Анализ детализации    | TaskAnalysisResult |
| `getNeuronsByLevel` | level: TaskDetailLevel | Рекомендация нейронов | string[]           |

### Validation

| Функция/Схема              | Тип                         | Описание                                   |
|----------------------------|-----------------------------|--------------------------------------------|
| `uuidSchema`               | ZodSchema                   | UUID v4                                    |
| `emailSchema`              | ZodSchema                   | Email                                      |
| `passwordSchema`           | ZodSchema                   | Пароль (8+ символов, upper, lower, number) |
| `gitUrlSchema`             | ZodSchema                   | Git URL                                    |
| `branchNameSchema`         | ZodSchema                   | Имя ветки                                  |
| `filePathSchema`           | ZodSchema                   | Путь к файлу                               |
| `paginationSchema`         | ZodSchema                   | Пагинация                                  |
| `registerInputSchema`      | ZodSchema                   | Регистрация                                |
| `loginInputSchema`         | ZodSchema                   | Логин                                      |
| `createProjectInputSchema` | ZodSchema                   | Создание проекта                           |
| `createSessionInputSchema` | ZodSchema                   | Создание сессии                            |
| `searchQuerySchema`        | ZodSchema                   | Поисковый запрос                           |
| `validateInput`            | schema, data                | Валидация данных                           | T |
| `isValidJson`              | str: string                 | JSON проверка                              | boolean |
| `sanitizeString`           | str: string                 | HTML removal                               | string |
| `isValidFileExtension`     | filename, allowedExtensions | Расширение файла                           | boolean |
| `isValidMimeType`          | mimeType, allowedTypes      | MIME type                                  | boolean |

### Примеры использования

```typescript
// Crypto
import { encrypt, decrypt, hashPassword, generateUuid } from '@/utils/crypto.js';

const apiKey = generateApiKey('sk_prod');
const hashed = await hashPassword('password123');
const encrypted = encrypt('sensitive data');

// Logger
import { log } from '@/utils/logger.js';

log.info('Request processed', { requestId, duration: 150 });
log.error('Failed to connect', { error: err.message, stack: err.stack });

// Task Analyzer
import { analyzeTaskDetail, getNeuronsByLevel } from '@/utils/task-detail-analyzer.js';

const result = analyzeTaskDetail('Create a new Vue component for user profile');
if (result.readyForAi) {
  const neurons = getNeuronsByLevel(result.level);
}

// Validation
import { validateInput, registerInputSchema } from '@/utils/validation.js';

const userData = validateInput(registerInputSchema, req.body);
```

---

## Зависимости

### Внешние

| Пакет   | Версия           | Назначение                        |
|---------|------------------|-----------------------------------|
| crypto  | Node.js built-in | Криптографические операции        |
| winston | ^3.x             | Логирование                       |
| zod     | ^3.x             | Схема валидации                   |
| bcrypt  | ^5.x             | Password hashing (dynamic import) |

### Внутренние модули

| Модуль | Путь                                                | Назначение                                    |
|--------|-----------------------------------------------------|-----------------------------------------------|
| config | [`config/index.ts`](a2a-server/src/config/index.ts) | Конфигурация (logLevel, logFormat, jwtSecret) |

### Конфигурация

```env
# Logger
LOG_LEVEL=info
LOG_FORMAT=json  # or 'pretty' for development
NODE_ENV=development  # or 'production' for file logging

# Crypto
ENCRYPTION_KEY=  # optional, uses JWT_SECRET as fallback
JWT_SECRET=  # required, 32+ characters
```

---

## План развития

### Фаза 1: Улучшение Crypto (приоритет: средний)

1. **Выделенный Encryption Key** (приоритет: высокий)
    - [x] ENCRYPTION_KEY с явной валидацией 32 символа
    - [x] Fallback логика с clear error message
    - [x] Key derivation для различных use cases

2. **Enhanced Password Security** (приоритет: средний)
    - [ ] Argon2id как альтернатива bcrypt
    - [ ] Entropy calculation
    - [ ] Password strength meter

3. **Streaming Encryption** (приоритет: низкий)
    - [ ] Encrypt/decrypt файлов через streams
    - [ ] Large file support

### Фаза 2: Enhanced Logging (приоритет: средний)

4. **Log Management** (приоритет: средний)
    - [ ] Daily log rotation
    - [ ] Compressed archives
    - [ ] Retention policy

5. **Structured Logging** (приоритет: средний)
    - [ ] JSON format по умолчанию
    - [ ] Standard fields (timestamp, level, service, correlationId)
    - [ ] Sensitive data redaction

6. **Transport Options** (приоритет: низкий)
    - [ ] Elasticsearch transport
    - [ ] Datadog transport
    - [ ] Custom file transport

### Фаза 3: Task Analyzer (приоритет: низкий)

7. **Enhanced Analysis** (приоритет: низкий)
    - [ ] Расширенный dictionary technical terms
    - [ ] Confidence score
    - [ ] Multi-language support

8. **ML Integration** (приоритет: низкий)
    - [ ] Simple ML classifier для task type
    - [ ] Training data from previous tasks

### Фаза 4: Validation (приоритет: средний)

9. **Advanced Validation** (приоритет: средний)
    - [ ] A2A Protocol message schemas
    - [ ] Context validation schemas
    - [ ] Async validators

10. **Schema Registry** (приоритет: низкий)
    - [ ] Centralized schema management
    - [ ] Versioning
    - [ ] Schema documentation

---

## Метрики для мониторинга

- Количество зашифрованных/дешифрованных операций
- Password hashing operations
- Validation errors by schema
- Log entries by level
- Task analyzer confidence distribution
- Average validation time
- Encryption/decryption latency

---

## Риски и ограничения

1. **Encryption key management** — текущий fallback на jwtSecret небезопасен
2. **No key rotation** — невозможность смены ключей без re-encryption
3. **Static technical terms** — ограниченный словарь в task analyzer
4. **Basic validation** — отсутствие async validators
5. **No log shipping** — только файловое логирование в production
6. **Password hashing** — bcrypt без cost factor конфигурации

---

## Связанные файлы

- [`a2a-server/src/utils/crypto.ts`](a2a-server/src/utils/crypto.ts)
- [`a2a-server/src/utils/logger.ts`](a2a-server/src/utils/logger.ts)
- [`a2a-server/src/utils/task-detail-analyzer.ts`](a2a-server/src/utils/task-detail-analyzer.ts)
- [`a2a-server/src/utils/validation.ts`](a2a-server/src/utils/validation.ts)
- [`a2a-server/src/config/index.ts`](a2a-server/src/config/index.ts) — конфигурация
