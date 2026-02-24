# План: Middleware (a2a-server)

## Текущее состояние

### Что делает модуль

**Middleware** ([`a2a-server/src/middleware/`](a2a-server/src/middleware)) — слой промежуточного ПО Express для аутентификации, валидации и обработки ошибок. Обеспечивает централизованную обработку запросов перед передачей контроллерам.

#### Текущие middleware:

1. **[`auth.middleware.ts`](a2a-server/src/middleware/auth.middleware.ts:1)** — Аутентификация и авторизация
   - [`authenticate()`](a2a-server/src/middleware/auth.middleware.ts:19) — обязательная аутентификация (Basic/Bearer)
   - [`optionalAuth()`](a2a-server/src/middleware/auth.middleware.ts:64) — опциональная аутентификация
   - [`requireAuth()`](a2a-server/src/middleware/auth.middleware.ts:105) — проверка наличия аутентификации
   - [`requireOwnership()`](a2a-server/src/middleware/auth.middleware.ts:120) — проверка владения ресурсом
   - [`rateLimitByClient()`](a2a-server/src/middleware/auth.middleware.ts:134) — rate limiting (заглушка)

2. **[`validate.middleware.ts`](a2a-server/src/middleware/validate.middleware.ts:1)** — Валидация входных данных
   - [`validate()`](a2a-server/src/middleware/validate.middleware.ts:13) — валидация body/params/query
   - [`validateBody()`](a2a-server/src/middleware/validate.middleware.ts:41) — валидация только body
   - [`validateParams()`](a2a-server/src/middleware/validate.middleware.ts:63) — валидация только params
   - [`validateQuery()`](a2a-server/src/middleware/validate.middleware.ts:85) — валидация только query
   - [`sanitize()`](a2a-server/src/middleware/validate.middleware.ts:107) — санитизация полей

3. **[`error.middleware.ts`](a2a-server/src/middleware/error.middleware.ts:1)** — Обработка ошибок
   - [`errorHandler()`](a2a-server/src/middleware/error.middleware.ts:41) — централизованный обработчик ошибок
   - [`notFound`](a2a-server/src/middleware/error.middleware.ts:88), [`validationError`](a2a-server/src/middleware/error.middleware.ts:88), [`unauthorized`](a2a-server/src/middleware/error.middleware.ts:88), [`forbidden`](a2a-server/src/middleware/error.middleware.ts:88) — фабрики ошибок

#### Архитектура:

- Типичная Express middleware архитектура
- Расширяет `Request` интерфейс для типизации `client`
- Использует Zod для валидации
- Интегрирован с `http-errors.js` для统一格式 ошибок

---

## Возможности для улучшения

### 1. Аутентификация

**Текущее:** Простой парольный доступ (hardcoded password)

**Предложения:**
- [ ] JWT токены с expiration
- [ ] Refresh token механизм
- [ ] API Key аутентификация для сервисов
- [ ] OAuth2 интеграция (Google, GitHub)
- [ ] Двухфакторная аутентификация (2FA)
- [ ] Password hashing вместо plaintext сравнения
- [ ] Блокировка аккаунта после N неудачных попыток

### 2. Rate Limiting

**Текущее:** Заглушка (`rateLimitByClient` — pass-through)

**Предложения:**
- [ ] Redis-backed rate limiter
- [ ] Per-client rate limits
- [ ] Per-endpoint rate limits
- [ ] Sliding window algorithm
- [ ] Custom rate limit headers (X-RateLimit-*)
- [ ] Rate limit по IP адресу

### 3. Валидация

**Текущее:** Zod валидация, только первая ошибка

**Предложения:**
- [ ] Возвращать все ошибки валидации, не только первую
- [ ] Кастомные валидаторы для специфичных данных
- [ ] Фильтрация XSS входящих данных
- [ ] Валидация файлов (type, size)
- [ ] Async валидация с внешними сервисами

### 4. Обработка ошибок

**Текущее:** Базовый error handler, маппинг кодов ошибок

**Предложения:**
- [ ] Error code registry с документацией
- [ ] Correlation ID для трассировки
- [ ] Error reporting в внешние сервисы (Sentry)
- [ ] Graceful shutdown обработка
- [ ] Retry-after header для 429
- [ ] CORS error handling

### 5. Корреляция и трассировка

**Текущее:** Не реализовано

**Предложения:**
- [ ] Request ID generation
- [ ] Correlation ID propagation
- [ ] OpenTelemetry интеграция
- [ ] Request/Response логирование
- [ ] Performance timing middleware

### 6. Безопасность

**Текущее:** Минимальная защита

**Предложения:**
- [ ] Helmet.js для security headers
- [ ] CORS конфигурация
- [ ] Request size limits
- [ ] SQL injection защита
- [ ] XSS protection
- [ ] CSRF токены для state-changing операций

---

## API / Функции

### Auth Middleware

| Функция | Параметры | Описание | Возвращает |
|---------|-----------|----------|------------|
| `authenticate` | req, res, next | Обязательная аутентификация | void |
| `optionalAuth` | req, res, next | Опциональная аутентификация | void |
| `requireAuth` | req, res, next | Проверка auth | void |
| `requireOwnership` | getResourceClientId | Проверка ownership | (req, res, next) => void |
| `rateLimitByClient` | maxRequests, windowMs | Rate limiting | (req, res, next) => void |

### Validate Middleware

| Функция | Параметры | Описание | Возвращает |
|---------|-----------|----------|------------|
| `validate` | schema: AnyZodObject | Валидация body/params/query | (req, res, next) => void |
| `validateBody` | schema: AnyZodObject | Валидация body | (req, res, next) => void |
| `validateParams` | schema: AnyZodObject | Валидация params | (req, res, next) => void |
| `validateQuery` | schema: AnyZodObject | Валидация query | (req, res, next) => void |
| `sanitize` | allowedFields: string[] | Фильтрация полей | (req, res, next) => void |

### Error Middleware

| Функция | Параметры | Описание | Возвращает |
|---------|-----------|----------|------------|
| `errorHandler` | err, req, res, next | Обработчик ошибок | void |
| `notFound` | code, message | 404 ошибка | AppError |
| `validationError` | path, message | 400 ошибка валидации | AppError |
| `unauthorized` | code, message | 401 ошибка | AppError |
| `forbidden` | code, message | 403 ошибка | AppError |

### Примеры использования

```typescript
// Аутентификация
router.get('/protected', authenticate, controller);
router.get('/optional', optionalAuth, controller);

// Валидация
const createRequestSchema = z.object({
  context: z.object({ project_path: z.string() }),
  message: z.string().optional(),
});

router.post('/requests', validate(createRequestSchema), controller);

// Комбинирование
router.post('/requests',
  authenticate,
  validate(createRequestSchema),
  sanitize(['context', 'message']),
  controller
);
```

---

## Зависимости

### Внешние

| Пакет | Версия | Назначение |
|-------|--------|------------|
| express | ^5.x | HTTP фреймворк |
| zod | ^3.x | Схема валидации |
| jsonwebtoken | - | JWT токены (предлагается) |
| express-rate-limit | - | Rate limiting (предлагается) |
| helmet | - | Security headers (предлагается) |

### Внутренние модули

| Модуль | Путь | Назначение |
|--------|------|------------|
| http-errors | [`errors/http-errors.js`](a2a-server/src/errors/http-errors.js) | Фабрики HTTP ошибок |
| logger | [`utils/logger.ts`](a2a-server/src/utils/logger.ts) | Логирование |
| types | [`types/index.ts`](a2a-server/src/types/index.ts) | TypeScript типы |

### Конфигурация

```env
# Текущие
A2A_SERVER_PASSWORD=a2a_dev_password
SKIP_AUTH=1
NODE_ENV=development

# Предлагаемые
JWT_SECRET=<32+ characters>
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## План развития

### Фаза 1: Безопасность (приоритет: высокий)

1. **Helmet.js** (приоритет: высокий)
   - [ ] Интегрировать helmet для security headers
   - [ ] Настроить CSP, HSTS, X-Frame-Options

2. **CORS** (приоритет: высокий)
   - [ ] Добавить CORS middleware
   - [ ] Конфигурация allowed origins
   - [ ] Preflight handling

3. **Rate Limiting** (приоритет: высокий)
   - [ ] Реализовать rateLimitByClient с Redis
   - [ ] Per-endpoint limits
   - [ ] Custom response headers

### Фаза 2: Аутентификация (приоритет: высокий)

4. **JWT Tokens** (приоритет: высокий)
   - [ ] Добавить JWT mint/verify
   - [ ] Token expiration
   - [ ] Refresh token endpoint

5. **Password Security** (приоритет: средний)
   - [ ] Password hashing (bcrypt/argon2)
   - [ ] Account lockout after failed attempts

6. **API Keys** (приоритет: средний)
   - [ ] API key generation
   - [ ] API key validation middleware

### Фаза 3: Валидация (приоритет: средний)

7. **Enhanced Validation** (приоритет: средний)
   - [ ] Return all validation errors
   - [ ] Custom validators registry
   - [ ] XSS sanitization

8. **File Validation** (приоритет: средний)
   - [ ] File type validation
   - [ ] File size limits
   - [ ] Upload scanning

### Фаза 4: Трассировка (приоритет: низкий)

9. **Request ID** (приоритет: средний)
   - [ ] Generate unique request ID
   - [ ] Add to response headers
   - [ ] Pass through logs

10. **Correlation ID** (приоритет: низкий)
    - [ ] Accept incoming correlation ID
    - [ ] Propagate to downstream calls

11. **OpenTelemetry** (приоритет: низкий)
    - [ ] Basic tracing setup
    - [ ] Span creation for requests

---

## Метрики для мониторинга

- Количество аутентифицированных запросов
- Количество неудачных попыток аутентификации
- Rate limit violations
- Время валидации запросов
- Количество ошибок по типам
- Request/Response размеры
- Average response time by endpoint

---

## Риски и ограничения

1. **Stateless дизайн** — сервер не хранит состояние клиента, всё в токенах
2. **Password в env** — текущая реализация требует безопасного хранения
3. **No rate limiting** — потенциальная уязвимость к滥用
4. **Limited validation** — возвращается только первая ошибка
5. **No tracing** — сложно отлаживать production проблемы
6. **No CSRF protection** — потенциальная уязвимость для state-changing операций

---

## Связанные файлы

- [`a2a-server/src/middleware/auth.middleware.ts`](a2a-server/src/middleware/auth.middleware.ts)
- [`a2a-server/src/middleware/validate.middleware.ts`](a2a-server/src/middleware/validate.middleware.ts)
- [`a2a-server/src/middleware/error.middleware.ts`](a2a-server/src/middleware/error.middleware.ts)
- [`a2a-server/src/errors/http-errors.js`](a2a-server/src/errors/http-errors.js)
- [`a2a-client/src/middleware/`](a2a-client/src/middleware/) — клиентские middleware для сравнения
