# A2A Server - План реализации

## Обзор

План реализации серверной части A2A системы на основе утверждённых требований.

**Технологический стек:**
- **Framework:** Express (TypeScript)
- **Database:** PostgreSQL + pgvector
- **Cache/Queue:** Redis + BullMQ
- **ML:** Plexe
- **Git:** simple-git

---

## Диаграмма архитектуры

```mermaid
graph TB
    subgraph Client
        A2AClient[A2A Client App]
    end
    
    subgraph Server
        API[Express API Server]
        WS[WebSocket Server]
        
        subgraph Core Services
            SessionService[Session Service]
            ProjectService[Project Service]
            GitService[Git Service]
            FileCache[File Cache Service]
            ArchAnalyzer[Architectural Analyzer]
        end
        
        subgraph ML Layer
            PlexeClient[Plexe Client]
            EmbeddingService[Embedding Service]
            IndexerService[Indexer Service]
            SearchService[Search Service]
        end
        
        subgraph Protocol
            ContextParser[Context Parser]
            FileBlockHandler[File Block Handler]
            MessageBuilder[Message Builder]
        end
    end
    
    subgraph Data Layer
        PostgreSQL[(PostgreSQL + pgvector)]
        Redis[(Redis)]
        FileStorage[File Storage]
    end
    
    subgraph External
        GitRepos[Git Repositories]
    end
    
    A2AClient --> API
    A2AClient --> WS
    
    API --> SessionService
    API --> ProjectService
    API --> SearchService
    
    WS --> SessionService
    
    SessionService --> ContextParser
    SessionService --> MessageBuilder
    
    ProjectService --> GitService
    ProjectService --> ArchAnalyzer
    
    GitService --> GitRepos
    GitService --> FileCache
    GitService --> FileStorage
    
    IndexerService --> PlexeClient
    IndexerService --> EmbeddingService
    SearchService --> PlexeClient
    
    ContextParser --> FileBlockHandler
    
    SessionService --> PostgreSQL
    ProjectService --> PostgreSQL
    SearchService --> PostgreSQL
    IndexerService --> PostgreSQL
    
    SessionService --> Redis
    IndexerService --> Redis
```

---

## Фазы реализации

### Фаза 1: Foundation (Базовая инфраструктура)

#### 1.1 Настройка проекта
- [ ] Инициализация npm проекта с TypeScript
- [ ] Настройка ESLint + Prettier
- [ ] Настройка Jest для тестирования
- [ ] Docker Compose конфигурация (PostgreSQL, Redis)
- [ ] Переменные окружения (.env)

#### 1.2 База данных
- [ ] Prisma setup
- [ ] Миграции (schema.prisma)
- [ ] Seed данные для тестирования
- [ ] Проверка pgvector расширения

#### 1.3 Express сервер
- [ ] Базовый Express setup
- [ ] Middleware (cors, helmet, rate limiter)
- [ ] Error handling
- [ ] Logging (Winston/Pino)
- [ ] Health check endpoints

---

### Фаза 2: Authentication & Projects

#### 2.1 Аутентификация
- [ ] Регистрация клиентов
- [ ] JWT токены
- [ ] API Key авторизация
- [ ] Middleware auth

#### 2.2 Управление проектами
- [ ] CRUD для проектов
- [ ] Git Service (клонирование)
- [ ] SSH key management
- [ ] Webhook endpoints

---

### Фаза 3: Session Management

#### 3.1 Сессии
- [ ] Создание сессии
- [ ] Хранение состояния
- [ ] WebSocket подключение
- [ ] Timeout handling

#### 3.2 Protocol Handler
- [ ] Context Block Parser
- [ ] File Block Handler
- [ ] Message Builder
- [ ] Валидация форматов

---

### Фаза 4: ML Integration

#### 4.1 Plexe Integration
- [ ] Plexe client wrapper
- [ ] Intent Classifier model
- [ ] Action Detector model
- [ ] Document Classifier model

#### 4.2 Indexing Pipeline
- [ ] File discovery
- [ ] Code chunking
- [ ] Embedding generation
- [ ] Vector storage

#### 4.3 Search Service
- [ ] Semantic search
- [ ] Hybrid search (semantic + lexical)
- [ ] Re-ranking
- [ ] Result formatting

---

### Фаза 5: Task Engine

#### 5.1 Task Processing
- [ ] Task creation from new_task
- [ ] Task queue (BullMQ)
- [ ] Task workers
- [ ] Progress tracking

#### 5.2 File Operations
- [ ] File reading from Git
- [ ] File diff generation
- [ ] File update application
- [ ] Verification workflow

---

### Фаза 6: Architectural Analyzer

#### 6.1 Structure Analysis
- [ ] Laravel standard structure
- [ ] Deviation detection
- [ ] Feature extraction
- [ ] Caching results

---

## Структура файлов для создания

```
a2a-server/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   ├── index.ts
│   ├── app.ts
│   │
│   ├── config/
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── sessions.routes.ts
│   │   └── health.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── project.controller.ts
│   │   └── session.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── session.service.ts
│   │   ├── git.service.ts
│   │   ├── file-cache.service.ts
│   │   └── architectural-analyzer.service.ts
│   │
│   ├── ml/
│   │   ├── plexe.client.ts
│   │   ├── embedding.service.ts
│   │   ├── indexer.service.ts
│   │   └── search.service.ts
│   │
│   ├── protocol/
│   │   ├── context-parser.ts
│   │   ├── file-block-handler.ts
│   │   └── message-builder.ts
│   │
│   ├── repositories/
│   │   ├── client.repository.ts
│   │   ├── project.repository.ts
│   │   ├── session.repository.ts
│   │   └── file.repository.ts
│   │
│   ├── queue/
│   │   ├── index.ts
│   │   ├── workers/
│   │   │   ├── indexing.worker.ts
│   │   │   └── task.worker.ts
│   │   └── jobs/
│   │       ├── index-project.job.ts
│   │       └── process-task.job.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rate-limiter.middleware.ts
│   │   └── validate.middleware.ts
│   │
│   ├── websocket/
│   │   ├── index.ts
│   │   └── handlers/
│   │       └── session.handler.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── protocol.types.ts
│   │   ├── ml.types.ts
│   │   └── api.types.ts
│   │
│   └── utils/
│       ├── logger.ts
│       ├── crypto.ts
│       └── validation.ts
│
└── tests/
    ├── setup.ts
    ├── unit/
    │   ├── services/
    │   └── protocol/
    └── integration/
        ├── auth.test.ts
        ├── projects.test.ts
        └── sessions.test.ts
```

---

## Зависимости (package.json)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "uuid": "^9.0.1",
    "ws": "^8.16.0",
    "@prisma/client": "^5.8.1",
    "ioredis": "^5.3.2",
    "bullmq": "^5.1.0",
    "simple-git": "^3.22.1",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcrypt": "^5.0.2",
    "@types/uuid": "^9.0.7",
    "@types/ws": "^8.5.10",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "prisma": "^5.8.1",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "prettier": "^3.2.4",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.4",
    "@types/supertest": "^6.0.2"
  }
}
```

---

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: a2a
      POSTGRES_PASSWORD: a2a_secret
      POSTGRES_DB: a2a_server
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U a2a"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://a2a:a2a_secret@postgres:5432/a2a_server
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

---

## Приоритеты реализации

| Приоритет | Компонент | Обоснование |
|-----------|-----------|-------------|
| **P0** | Express + DB setup | Основа для всего |
| **P0** | Auth middleware | Безопасность |
| **P1** | Project + Git Service | Работа с репозиториями |
| **P1** | Session + Protocol | Основной функционал |
| **P2** | ML + Plexe | Интеллектуальный поиск |
| **P2** | Indexing Pipeline | Производительность |
| **P3** | WebSocket | Real-time обновления |
| **P3** | Architectural Analyzer | Улучшение UX |

---

## Следующие шаги

1. **Начать с Фазы 1** - создать базовую структуру проекта
2. **Реализовать аутентификацию** - защитить API
3. **Добавить Git Service** - работа с репозиториями
4. **Интегрировать Plexe** - ML-функциональность
5. **Протестировать протокол** - соответствие клиентской документации

---

**Статус:** Готов к реализации  
**Дата:** 2026-02-19
