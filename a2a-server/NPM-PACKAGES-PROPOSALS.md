# План: NPM Packages Proposals для a2a-server

## Текущее состояние

### Существующие зависимости

#### Основные зависимости (dependencies):
```
json
{
  "@prisma/client": "^5.8.1",
  "@types/pg": "^8.16.0",
  "bcrypt": "^5.1.1",
  "compression": "^1.7.4",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "helmet": "^7.1.0",
  "ioredis": "^5.3.2",
  "jsonwebtoken": "^9.0.2",
  "pg": "^8.18.0",
  "simple-git": "^3.22.1",
  "uuid": "^9.0.1",
  "winston": "^3.11.0",
  "zod": "^3.22.4"
}
```

#### Dev зависимости (devDependencies):
```
json
{
  "@types/bcrypt": "^5.0.2",
  "@types/compression": "^1.7.5",
  "@types/cors": "^2.8.17",
  "@types/express": "^4.17.21",
  "@types/js-yaml": "^4.0.9",
  "@types/jsonwebtoken": "^9.0.5",
  "@types/node": "^20.11.0",
  "@types/supertest": "^6.0.2",
  "@types/uuid": "^9.0.7",
  "@typescript-eslint/eslint-plugin": "^6.19.0",
  "@typescript-eslint/parser": "^6.19.0",
  "cross-env": "^10.1.0",
  "eslint": "^8.56.0",
  "prettier": "^3.2.4",
  "prisma": "^5.8.1",
  "supertest": "^6.3.4",
  "ts-node": "^10.9.2",
  "ts-node-dev": "^2.0.0",
  "tsx": "^4.19.0",
  "typescript": "^5.3.3",
  "vitest": "^2.1.9"
}
```

### Архитектура

- **Web Framework:** Express.js
- **Database:** PostgreSQL через Prisma ORM
- **Cache:** Redis через ioredis
- **Authentication:** JWT + bcrypt
- **Logging:** Winston
- **Git:** simple-git для git операций

---

## Возможности для улучшения

### 1. API и HTTP

**Текущее:** Express.js

**Предложения:**
- [ ] `fastify` — более быстрый альтернативный фреймворк
- [ ] `tsoa` — TypeScript OpenAPI генерация
- [ ] `zod-openapi` — Zod + OpenAPI интеграция

### 2. База данных

**Текущее:** Prisma + PostgreSQL

**Предложения:**
- [ ] `drizzle-orm` — легковесная ORM
- [ ] `node-postgres` — нативный драйвер (уже есть через @types/pg)

### 3. Кэширование

**Текущее:** ioredis (Redis)

**Предложения:**
- [x] **Использовать нативный `node:cache`** — встроенный кэш
- [ ] `cache-manager` — абстракция кэширования

### 4. AI/ML Интеграции

**Текущее:** Отсутствует

**Предложения:**
- [ ] `langchain` — LLM фреймворк
- [ ] `ollama` — локальные модели (есть в проекте)
- [ ] `@qdrant/js-client` — vector database

### 5. Анализ кода

**Текущее:** simple-git

**Предложения:**
- [ ] `@babel/parser` — парсинг JavaScript/TypeScript
- [ ] `ts-morph` — TypeScript AST манипуляции

### 6. Файловая система

**Текущее:** Node.js built-in

**Предложения:**
- [x] **Использовать нативный `fs` / `fs/promises`** — уже используется
- [x] **Использовать нативный `path`** — для путей
- [ ] `chokidar` — только если нужен сложный watching

### 7. Graph / Visualization

**Текущее:** Отсутствует на сервере

**Предложения:**
- [ ] `graphlib` — графовые алгоритмы
- [ ] `dagre` — DAG layout

### 8. Безопасность

**Текущее:** bcrypt, helmet

**Предложения:**
- [x] **Использовать нативный `crypto`** — для шифрования
- [ ] `express-validator` — валидация input

### 9. Мониторинг и Логирование

**Текущее:** Winston

**Предложения:**
- [x] **Использовать нативный `console` с pino-like форматом**
- [ ] `pino` — более быстрый логгер
- [ ] `morgan` — HTTP логирование

### 10. WebSocket и Real-time

**Текущее:** Отсутствует

**Предложения:**
- [ ] `socket.io` — WebSocket абстракция
- [x] **Использовать нативный `ws`** — нативный WebSocket

### 11. Тестирование

**Текущее:** Vitest, supertest

**Предложения:**
- [x] **Использовать встроенные Node.js assertions**
- [ ] `@faker-js/faker` — генерация тестовых данных

---

## Нативные Node.js модули (замена пакетам)

Многие npm пакеты можно заменить на встроенные модули Node.js:

| Пакет | Нативная замена | Node.js версия |
|-------|-----------------|----------------|
| `uuid` | `crypto.randomUUID()` | 14.17+ |
| `dotenv` | `process.env` / `dotenv` | 20.6+ |
| `fs-extra` | `fs`, `fs/promises` | все версии |
| `glob` | `fs.glob` + RegExp | все версии |
| `chokidar` | `fs.watch`, `fs.watchFile` | все версии |
| `rimraf` | `fs.rm` с recursive | 14+ |
| `mkdirp` | `fs.mkdir` с recursive | 10+ |
| `nanoid` | `crypto.randomUUID()` | 14.17+ |
| `md5` / `sha256` | `crypto.createHash()` | все версии |
| `bcrypt` | `crypto.scrypt` / `argon2` | 10+ |
| `crypto-js` | `crypto` | все версии |
| `winston` | `console` + custom format | все версии |
| `moment` | `Intl.DateTimeFormat` | все версии |
| `date-fns` | `Intl`, `Date` | все версии |
| `lodash` | `Object`, `Array` методы | все версии |
| `ws` | `node:http` / `node:https` | все версии |
| `compression` | `node:zlib` | все версии |
| `cors` | `node:http` middleware | все версии |
| `express` | `node:http` / `fastify` | - |
| `morgan` | `node:http` logging | все версии |

### Примеры замены

```
typescript
// Вместо uuid
import { randomUUID } from 'crypto';
const id = randomUUID();

// Вместо fs-extra
import { readFile, writeFile, mkdir, rm, copyFile } from 'fs/promises';

// Вместо bcrypt
import { scrypt, randomBytes } from 'crypto';
const salt = randomBytes(16).toString('hex');
scrypt(password, salt, 64, (err, derivedKey) => { ... });

// Вместо md5/sha256
import { createHash } from 'crypto';
const hash = createHash('sha256').update(data).digest('hex');

// Вместо winston
const log = (level: string, message: string) => {
  console[level as 'log'|'info'|'warn'|'error'](
    JSON.stringify({ level, message, timestamp: new Date().toISOString() })
  );
};

// Вместо compression
import { createGzip } from 'node:zlib';
const gzip = createGzip();

// Вместо cors
import { createServer } from 'node:http';
// CORS через node:http middleware

// Вместо moment/date-fns
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date);
};
```

---

## Зависимости

### Текущие зависимости

```
json
{
  "dependencies": {
    "@prisma/client": "^5.8.1",
    "bcrypt": "^5.1.1",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.18.0",
    "simple-git": "^3.22.1",
    "uuid": "^9.0.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "prisma": "^5.8.1",
    "typescript": "^5.3.3",
    "vitest": "^2.1.9",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4"
  }
}
```

### Предлагаемые зависимости (минимальные)

```
json
{
  "dependencies": {
    "@prisma/client": "^5.8.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.18.0",
    "simple-git": "^3.22.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "prisma": "^5.8.1",
    "typescript": "^5.3.3",
    "vitest": "^2.1.9",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4"
  }
}
```

Примечание: Многие пакеты могут быть заменены нативными Node.js модулями (uuid, fs-extra, bcrypt, crypto-js, winston, compression, cors, и др.)

---

## План развития

### Фаза 1: Native Modules (1 неделя)
1. Заменить uuid на crypto.randomUUID()
2. Заменить bcrypt на crypto.scrypt (или оставить bcrypt)
3. Упростить fs операции
4. Заменить winston на консоль с форматом

### Фаза 2: AI/ML Интеграции (2 недели)
1. Добавить LangChain для LLM
2. Интегрировать Ollama
3. Добавить Qdrant для векторов
4. Создать AIService

### Фаза 3: Graph операции (1 неделя)
1. Добавить graphlib
2. Интегрировать dagre
3. Создать GraphService

### Фаза 4: Real-time (1 неделя)
1. Добавить Socket.IO
2. Создать WebSocket middleware

### Фаза 5: Тестирование (1 неделя)
1. Добавить @faker-js/faker
2. Расширить интеграционные тесты

---

## Критерии успеха

1. **Производительность**: Response time < 100ms для API
2. **Native First**: Предпочитать нативные модули Node.js
3. **AI Интеграция**: Ollama работает корректно
4. **Graph**: Точность impact analysis > 90%

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| LangChain размер | Высокая | Среднее | Lazy loading |
| Native модули | Низкая | Низкое | Хорошая документация |
| Graph перформанс | Средняя | Среднее | Оптимизация запросов |

---

**Дата:** 2025-01-17  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~6KB
