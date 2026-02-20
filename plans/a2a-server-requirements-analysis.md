# Анализ требований к серверной части A2A

## Обзор

Документ анализирует текущее состояние документации и определяет, чего не хватает для реализации серверной части A2A системы.

**Контекст:**
- **Клиентская часть** описана в `a2a-codebase-agen-v1.md`
- **Серверная часть** должна быть реализована на TypeScript
- **Целевые проекты** - Laravel 11 (PHP, Vue, Tailwind)
- **Режим работы** - удалённый сервер через Git/API

---

## 1. Что уже определено в клиентской документации

### 1.1 Протокол общения

| Аспект | Статус | Описание |
|--------|--------|----------|
| Context Block | ✅ Определён | JSON-структура с version, session_id, new_task, tasks, etc. |
| File Block | ✅ Определён | Markdown блоки с содержимым файлов |
| Инициализация сессии | ✅ Определён | new_task массив с текстом + hints + architectural_features |
| Кнопка "Делаем" | ✅ Определён | continue: true для итерации без ввода |
| Верификация изменений | ✅ Определён | request_files после обновления |

### 1.2 ML-компоненты (из анализа кандидатов)

| Компонент | Приоритет | Готовность |
|-----------|-----------|------------|
| Query Intent Classification | Высокий | Примеры данных есть |
| Search Relevance Scoring | Высокий | Требует feedback-данных |
| Code Element Classification | Средний | Есть примеры |
| Ignore Pattern Prediction | Средний | Есть данные |
| Strategy Selection | Средний | Требует A/B testing |

---

## 2. Чего НЕ ХВАТАЕТ для серверной части

### 2.1 Архитектура сервера 🔴 КРИТИЧНО

```
┌─────────────────────────────────────────────────────────────┐
│                    A2A Server (TypeScript)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ??? Компоненты сервера - НЕ ОПРЕДЕЛЕНО                      │
│                                                              │
│  - Session Manager?                                          │
│  - Task Engine?                                              │
│  - File Manager?                                             │
│  - ML Search Engine?                                         │
│  - Git Integration?                                          │
│  - Protocol Handler?                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Вопросы для уточнения:**
1. Монолитный или микросервисный подход?
2. Какой веб-фреймворк? (Express, Fastify, NestJS, Hono)
3. Как обрабатываются долгие задачи? (Queue, Background jobs)

### 2.2 API сервера 🔴 КРИТИЧНО

**Не определено:**
- HTTP endpoints
- WebSocket для real-time обновлений?
- REST vs GraphQL vs gRPC?
- Аутентификация и авторизация
- Rate limiting

### 2.3 Интеграция с Git 🔴 КРИТИЧНО

**Не определено:**
- Как сервер получает доступ к репозиториям?
- Поддерживаемые платформы (GitHub, GitLab, Bitbucket)?
- SSH ключи или токены?
- Создание веток/PR/коммитов?

### 2.4 Хранение данных 🟡 ВАЖНО

**Не определено:**
- База данных для сессий и задач (PostgreSQL, MongoDB, Redis?)
- Векторное хранилище для embeddings
- Файловый кэш проектов
- Миграции и схема БД

### 2.5 ML-инфраструктура 🟡 ВАЖНО

**Не определено:**
- Где выполняются ML-модели? (локально, внешние API)
- Векторная БД (Pinecone, Weaviate, Qdrant, pgvector?)
- Модель для embeddings (OpenAI, CodeBERT, custom?)
- Индексация проектов - когда и как?

### 2.6 Безопасность 🟡 ВАЖНО

**Не определено:**
- Аутентификация клиентов
- Авторизация доступа к проектам
- Шифрование данных
- Audit logging

---

## 3. Предлагаемая архитектура сервера

### 3.1 Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────────────────┐
│                         A2A Server                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   API Layer  │  │   WebSocket  │  │   Protocol Handler       │  │
│  │              │  │   Server     │  │                          │  │
│  │  - REST      │  │              │  │  - Context Block Parser  │  │
│  │  - Auth      │  │  - Real-time │  │  - File Block Manager    │  │
│  │  - Rate      │  │    updates   │  │  - Message Serializer    │  │
│  │    Limit     │  │              │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                       │                 │
│         └─────────────────┼───────────────────────┘                 │
│                           │                                         │
│  ┌────────────────────────┴────────────────────────────────────┐   │
│  │                    Core Services                              │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  Session    │  │    Task     │  │    Project          │  │   │
│  │  │  Manager    │  │    Engine   │  │    Manager          │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  Git        │  │    File     │  │    Architectural    │  │   │
│  │  │  Client     │  │    Cache    │  │    Analyzer         │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────┴────────────────────────────────────┐   │
│  │                    ML Search Engine                           │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  Indexer    │  │  Embedding  │  │    Hybrid           │  │   │
│  │  │             │  │  Service    │  │    Search           │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────┴────────────────────────────────────┐   │
│  │                    Data Layer                                 │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ PostgreSQL  │  │   Redis     │  │    Vector DB        │  │   │
│  │  │ (sessions,  │  │   (cache,   │  │    (embeddings)     │  │   │
│  │  │  projects)  │  │    queues)  │  │                     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Компоненты сервера

#### API Layer
- **Framework:** NestJS (структурированный, декораторы, DI)
- **Endpoints:**
  - `POST /sessions` - создание сессии
  - `POST /sessions/:id/message` - отправка сообщения
  - `GET /sessions/:id` - статус сессии
  - `WebSocket /ws/sessions/:id` - real-time обновления

#### Session Manager
- Создание и управление сессиями
- Хранение состояния сессии
- Таймауты и очистка

#### Task Engine
- Парсинг new_task
- Создание задач
- Отслеживание прогресса
- Приоритизация

#### Project Manager
- Регистрация проектов
- Метаданные проектов
- Связь с Git Client

#### Git Client
- Клонирование репозиториев
- Чтение файлов
- Создание веток/коммитов
- Push изменений

#### File Cache
- Локальный кэш файлов проекта
- Отслеживание изменений
- Diff generation

#### Architectural Analyzer
- Определение architectural_features
- Сравнение со стандартной структурой Laravel
- Выявление нестандартных расположений

#### ML Search Engine
- **Indexer:** Индексация кода проектов
- **Embedding Service:** Генерация векторов
- **Hybrid Search:** Семантический + лексический поиск

---

## 4. Вопросы для уточнения

### 4.1 Технологический стек

| Вопрос | Варианты |
|--------|----------|
| Веб-фреймворк? | NestJS / Express / Fastify / Hono |
| База данных? | PostgreSQL / MongoDB |
| Векторная БД? | pgvector / Qdrant / Weaviate / Pinecone |
| Очередь задач? | BullMQ (Redis) / RabbitMQ |
| ML API? | OpenAI / Local models / Plexe |

### 4.2 Интеграция с Git

| Вопрос | Варианты |
|--------|----------|
| Платформы? | GitHub / GitLab / Bitbucket / Все |
| Доступ? | SSH ключи / Personal tokens / OAuth |
| Изменения? | Прямой commit / Pull Request / Branch |

### 4.3 Развёртывание

| Вопрос | Варианты |
|--------|----------|
| Среда? | Docker / Kubernetes / Serverless |
| Облако? | AWS / GCP / Azure / Self-hosted |

---

## 5. Утверждённый технологический стек

### 5.1 Выбранные технологии

| Компонент | Решение | Обоснование |
|-----------|---------|-------------|
| **Framework** | Express | Минималистичный, гибкий, много плагинов |
| **Database** | PostgreSQL + pgvector | Реляционная БД с поддержкой векторов |
| **Cache** | Redis | Кэш + очереди задач |
| **Queue** | BullMQ | Интеграция с Redis, мониторинг |
| **ML** | Plexe | Как указано в ML-анализе |
| **Git** | simple-git / isomorphic-git | Только Git протокол, без API платформ |
| **Deploy** | Docker + Docker Compose | Простота развёртывания |

### 5.2 Структура проекта

```
a2a-server/
├── src/
│   ├── index.ts                 # Entry point
│   ├── app.ts                   # Express app setup
│   ├── config/
│   │   ├── index.ts             # Configuration loader
│   │   ├── database.ts          # PostgreSQL config
│   │   └── redis.ts             # Redis config
│   ├── routes/
│   │   ├── index.ts             # Router setup
│   │   ├── sessions.ts          # Session endpoints
│   │   ├── projects.ts          # Project endpoints
│   │   └── health.ts            # Health check
│   ├── controllers/
│   │   ├── SessionController.ts
│   │   └── ProjectController.ts
│   ├── services/
│   │   ├── SessionService.ts
│   │   ├── ProjectService.ts
│   │   ├── GitService.ts
│   │   ├── FileCacheService.ts
│   │   └── ArchitecturalAnalyzer.ts
│   ├── ml/
│   │   ├── PlexeClient.ts       # Plexe integration
│   │   ├── EmbeddingService.ts  # Code embeddings
│   │   ├── IndexerService.ts    # Code indexing
│   │   └── SearchService.ts     # Hybrid search
│   ├── protocol/
│   │   ├── ContextParser.ts     # Parse context blocks
│   │   ├── FileBlockHandler.ts  # Handle file blocks
│   │   └── MessageBuilder.ts    # Build responses
│   ├── models/
│   │   ├── Session.ts
│   │   ├── Project.ts
│   │   ├── Task.ts
│   │   └── File.ts
│   ├── repositories/
│   │   ├── SessionRepository.ts
│   │   ├── ProjectRepository.ts
│   │   └── TaskRepository.ts
│   ├── queue/
│   │   ├── index.ts             # BullMQ setup
│   │   ├── workers/
│   │   │   ├── IndexingWorker.ts
│   │   │   └── TaskWorker.ts
│   │   └── jobs/
│   │       ├── IndexProjectJob.ts
│   │       └── ProcessTaskJob.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   └── types/
│       ├── index.ts
│       ├── protocol.ts          # Protocol types
│       └── ml.ts                # ML types
├── prisma/
│   └── schema.prisma            # Database schema
├── tests/
│   ├── unit/
│   └── integration/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 6. Следующие шаги

1. ~~Уточнить технологический стек~~ ✅ Выбрано: Express + PostgreSQL + pgvector + Plexe
2. ~~Определить Git-интеграцию~~ ✅ Только Git протокол
3. ~~Выбрать ML-решение~~ ✅ Plexe
4. **Спроектировать API** - endpoints и форматы
5. **Определить схему БД** - таблицы и отношения
6. **Создать детальную архитектуру** - компоненты и интерфейсы

---

**Статус:** Требования утверждены  
**Дата:** 2026-02-19
