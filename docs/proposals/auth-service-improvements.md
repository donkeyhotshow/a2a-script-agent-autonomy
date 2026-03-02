# План: Auth Service (4KB)

## Текущее состояние

### Что делает сервис

**AuthService** (`a2a-server/src/services/auth.service.ts`) — сервис аутентификации и авторизации. Обрабатывает
регистрацию клиентов, выдачу и обновление JWT токенов, верификацию учётных данных.

#### Основные функции:

1. **JWT токены** — [`signAccessToken()`](a2a-server/src/services/auth.service.ts:15), [
   `signRefreshToken()`](a2a-server/src/services/auth.service.ts:23)
    - Access token: истекает через `config.jwtExpiresIn`
    - Refresh token: истекает через `config.jwtRefreshExpiresIn`
    - Payload: `{ sub: clientId, email, type: 'access' | 'refresh' }`

2. **Регистрация** — [`register()`](a2a-server/src/services/auth.service.ts:50)
    - Валидация: name, email, password обязательны
    - Проверка уникальности email
    - Хеширование пароля + генерация API ключа
    - Возвращает: id, name, email, apiKey

3. **Аутентификация**:
    - [`getTokenByApiKey()`](a2a-server/src/services/auth.service.ts:74) — по API ключу
    - [`getTokenByCredentials()`](a2a-server/src/services/auth.service.ts:83) — по email/password
    - [`refreshToken()`](a2a-server/src/services/auth.service.ts:100) — обновление токенов

4. **Получение данных клиента** — [`getClientById()`](a2a-server/src/services/auth.service.ts:122)

5. **Dev mode** — [`DEV_CREDS`](a2a-server/src/services/auth.service.ts:35)
    - Email: `dev@example.com`, password: `dev`
    - Создаёт виртуального клиента `dev-client`

#### Текущее использование:

- [`auth.controller.ts`](a2a-server/src/controllers/auth.controller.ts) — HTTP эндпоинты
- [`auth.middleware.ts`](a2a-client/src/middleware/auth.middleware.ts) — верификация токенов

---

## Возможности для улучшения

### 1. RBAC и права доступа

**Текущее:** Отсутствует ролевая система

**Предложения:**

- [ ] Роли: admin, user, guest
- [ ] Права на ресурсы (permissions)
- [ ] Middleware для проверки прав
- [ ] Super admin для системных операций

### 2. Безопасность

**Текущее:** Базовые проверки

**Предложения:**

- [ ] Rate limiting на логин
- [ ] Блокировка аккаунта после N неудачных попыток
- [ ] 2FA / TOTP
- [ ] OAuth2 провайдеры (Google, GitHub)
- [ ] Password reset flow
- [ ] Email verification
- [ ] CSRF protection

### 3. Сессии и устройства

**Текущее:** Stateless JWT

**Предложения:**

- [ ] Blacklist токенов (logout)
- [ ] Сессии с device fingerprint
- [ ] Multiple sessions management
- [ ] Принудительный logout всех устройств
- [ ] Token rotation при refresh

### 4. Аудит и логирование

**Текущее:** Базовое логирование

**Предложения:**

- [ ] Лог всех попыток входа (success/fail)
- [ ] Аудит изменений аккаунта
- [ ] Уведомления о подозрительной активности
- [ ] Compliance отчёты

### 5. Управление API ключами

**Текущее:** Один API ключ при регистрации

**Предложения:**

- [ ] Множественные API ключи
- [ ] Срок действия ключа
- [ ] Ограничение по IP
- [ ] Scope ключа (read/write)

### 6. Валидация и типизация

**Текущее:** Частичная валидация

**Предложения:**

- [ ] Zod схемы для всех input
- [ ] Type-safe возвращаемые типы
- [ ] Strongly typed errors

### 7. Перформанс

**Текущее:** Синхронные операции

**Предложения:**

- [ ] Кэширование верификации токенов
- [ ] Асинхронное хеширование паролей (bcrypt rounds)
- [ ] Connection pooling для БД

---

## API методы

### Существующие методы

```
typescript
// Регистрация
function register(input: RegisterInput): Promise<RegisterResult>;
interface RegisterInput { name: string; email: string; password: string; }
interface RegisterResult { id: string; name: string; email: string; apiKey: string; }

// Токены
function getTokenByApiKey(apiKey: string): Promise<TokenResult | null>;
function getTokenByCredentials(email: string, password: string): Promise<TokenResult | null>;
function refreshToken(token: string): Promise<TokenResult>;
interface TokenResult { accessToken: string; refreshToken: string; }

// Клиент
function getClientById(id: string): Promise<ClientInfo | null>;
interface ClientInfo { id: string; name: string; email: string; }

// Утилиты токенов (internal)
function signAccessToken(clientId: string, email: string): string;
function signRefreshToken(clientId: string, email: string): string;
function verifyToken(token: string): JwtPayload;
```

### Предлагаемые новые методы

```
typescript
// RBAC
function assignRole(clientId: string, role: Role): Promise<void>;
function hasPermission(clientId: string, permission: Permission): Promise<boolean>;
function checkPermission(clientId: string, permission: Permission): void;

// Управление сессиями
function revokeToken(token: string): Promise<void>;
function revokeAllClientSessions(clientId: string): Promise<void>;
function getActiveSessions(clientId: string): Promise<SessionInfo[]>;

// API ключи
function createApiKey(clientId: string, options?: ApiKeyOptions): Promise<ApiKey>;
function revokeApiKey(clientId: string, keyId: string): Promise<void>;
function listApiKeys(clientId: string): Promise<ApiKey[]>;

// Безопасность
function requestPasswordReset(email: string): Promise<void>;
function resetPassword(token: string, newPassword: string): Promise<void>;
function verify2FA(clientId: string, code: string): Promise<TokenResult>;
function enable2FA(clientId: string): Promise<string>; // secret
function disable2FA(clientId: string, code: string): Promise<void>;

// Email verification
function sendVerificationEmail(clientId: string): Promise<void>;
function verifyEmail(token: string): Promise<void>;

// Аудит
function getLoginHistory(clientId: string, options?: Pagination): Promise<LoginEvent[]>;
function getAuditLog(clientId: string, options?: AuditOptions): Promise<AuditEvent[]>;

// Types
type Role = 'admin' | 'user' | 'guest';
type Permission = 'read' | 'write' | 'admin' | 'custom';

interface ApiKeyOptions {
  name?: string;
  expiresIn?: number;
  ipWhitelist?: string[];
  scope?: string[];
}

interface ApiKey {
  id: string;
  key: string;
  name?: string;
  expiresAt?: Date;
  createdAt: Date;
}

interface SessionInfo {
  id: string;
  deviceInfo: string;
  ip: string;
  createdAt: Date;
  lastUsedAt: Date;
}
```

---

## Зависимости

### Текущие зависимости

```
json
{
  "dependencies": {
    "jsonwebtoken": "^9.x"
  },
  "internal": {
    "../repositories/client.repository.js": "clientRepo",
    "../utils/crypto.js": "hashPassword, generateApiKey, verifyPassword",
    "../config/index.js": "config",
    "../types/errors.js": "AppError"
  }
}
```

### Предлагаемые зависимости

```
json
{
  "dependencies": {
    "jsonwebtoken": "^9.x",
    "zod": "^3.x", // Валидация
    "otplib": "^7.x", // 2FA TOTP
    "uuid": "^9.x" // ID генерация
  },
  "optional": {
    "@node-saml/passport-saml": "^4.x", // SAML/OAuth
    "express-rate-limit": "^6.x" // Rate limiting
  }
}
```

---

## План развития

### Фаза 1: Базовая стабилизация ✅

- [x] Текущая реализация (JWT, регистрация, логин)
- [x] API ключи при регистрации
- [x] Dev mode credentials

### Фаза 2: Безопасность (1 неделя)

**Задачи:**

1. Rate limiting на `/login` endpoint
2. Блокировка аккаунта после 5 неудачных попыток
3. Zod схемы для RegisterInput
4. Password validation (сложность, история)

**Файлы:**

- `a2a-server/src/services/auth.validator.ts` — валидация
- `a2a-server/src/services/auth.security.ts` — security логика

### Фаза 3: RBAC (1 неделя)

**Задачи:**

1. Role enum и permissions
2. Middleware для проверки прав
3. Super admin账户

**Файлы:**

- `a2a-server/src/services/auth.rbac.ts` — роли и права

### Фаза 4: Сессии (1 неделя)

**Задачи:**

1. Token blacklist (redis/in-memory)
2. Token rotation
3. Multiple sessions

**Файлы:**

- `a2a-server/src/services/auth.sessions.ts` — управление сессиями

### Фаза 5: 2FA и Advanced Security (1 неделя)

**Задачи:**

1. TOTP 2FA
2. Password reset flow
3. Email verification

**Файлы:**

- `a2a-server/src/services/auth.2fa.ts` — 2FA логика
- `a2a-server/src/services/auth.email.ts` — email operations

### Фаза 6: API Keys Management (1 неделя)

**Задачи:**

1. Множественные ключи
2. Scope и IP restrictions
3. Key rotation

**Файлы:**

- `a2a-server/src/services/auth.api-keys.ts`

### Фаза 7: Аудит и Мониторинг (1 неделя)

**Задачи:**

1. Login history
2. Audit events
3. Anomaly detection alerts

**Файлы:**

- `a2a-server/src/services/auth.audit.ts`

---

## Примеры использования

### Базовое использование

```
typescript
import { register, getTokenByCredentials, refreshToken } from './services/auth.service.js';

// Регистрация
const user = await register({
  name: 'John',
  email: 'john@example.com',
  password: 'securepassword',
});
// { id: '...', name: 'John', email: 'john@example.com', apiKey: 'ak_...' }

// Логин
const tokens = await getTokenByCredentials('john@example.com', 'securepassword');
// { accessToken: 'eyJ...', refreshToken: 'eyJ...' }

// Refresh
const newTokens = await refreshToken(tokens.refreshToken);
```

### С RBAC (после Фазы 3)

```
typescript
import { checkPermission } from './services/auth.service.js';

// Middleware
function requirePermission(permission: string) {
  return (req, res, next) => {
    const clientId = req.clientId;
    if (!checkPermission(clientId, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Использование
app.delete('/admin/users', requirePermission('admin'), deleteUser);
```

### С 2FA (после Фазы 5)

```
typescript
import { enable2FA, verify2FA } from './services/auth.service.js';

// Включение
const secret = await enable2FA(clientId);
// Показать QR код пользователю

// Логин с 2FA
const tokens = await verify2FA(clientId, '123456');
```

### С сессиями (после Фазы 4)

```
typescript
import { revokeAllClientSessions } from './services/auth.service.js';

// Logout everywhere
await revokeAllClientSessions(clientId);
```

---

## Критерии успеха

1. **Безопасность**: 0 успешных брутфорс атак, 2FA опционально
2. **Производительность**: Время верификации токена < 2ms
3. **Надёжность**: Token blacklist работает корректно
4. **Соответствие**: Audit log доступен

---

## Риски

| Риск                       | Вероятность | Влияние | Митигация                  |
|----------------------------|-------------|---------|----------------------------|
| Сложность 2FA              | Средняя     | Среднее | Фазированная реализация    |
| Token blacklist перформанс | Средняя     | Высокое | Redis + in-memory fallback |
| OAuth интеграция           | Низкая      | Среднее | Внешние библиотеки         |

---

**Дата:** 2026-02-24  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~4KB (включая все предложения)
