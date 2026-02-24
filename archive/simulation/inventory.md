# Инвентаризация системы A2A

## 1. Сервер (a2a-server/)

### Что реализовано

**Точка входа** ([`src/index.ts`](a2a-server/src/index.ts)):
- HTTP сервер на Express
- WebSocket инициализация (`/ws/sessions/*`)
- Request Processor — таймерная обработка очереди запросов
- Graceful shutdown с таймаутом 10 сек
- Обработка uncaught exceptions и unhandled rejections

**Приложение** ([`src/app.ts`](a2a-server/src/app.ts)):
- Express с middleware: helmet, cors, compression, JSON parser (10mb limit)
- Health check endpoint: `/health`
- API routes: `/api/v1`
- Error handler middleware

**Маршруты** ([`src/routes/index.ts`](a2a-server/src/routes/index.ts)):
- `/api/v1/sessions` — управление сессиями
- `/api/v1/requests` — async протокол (Promise/Polling)
- `/api/v1/invoke` — отправка сообщений (возвращает promiseId)
- `/api/v1/message` — алиас для invoke
- `/api/v1/health` — health check

**Сервисы** (`src/services/`):
- `request-processor.service.ts` — основная логика обработки запросов
- `request.service.ts` — CRUD для Request модели
- `invoke.service.ts` — постановка запросов в очередь
- `neuron-activator.service.ts` — активация нейронов
- `entity-recognizer.service.ts` — распознавание сущностей из кода
- `graph-store.service.ts` — управление графом знаний
- `framework-extractor.service.ts` — извлечение фреймворков из package.json/composer.json

**ML компоненты** (`src/ml/`):
- `embedding.service.ts` — сервис эмбеддингов
- `indexer.service.ts` — индексация кода
- `search.service.ts` — поиск по коду
- `plexe.client.ts` — клиент для Plexe AI

**Middleware** (`src/middleware/`):
- `auth.middleware.ts` — аутентификация
- `error.middleware.ts` — обработка ошибок
- `rate-limiter.middleware.ts` — ограничение запросов
- `validate.middleware.ts` — валидация

**WebSocket** (`src/websocket/`):
- Инициализация в index.ts
- Обработка upgrade на `/ws/sessions/*`

### Prisma схема

**Модели данных** ([`prisma/schema.prisma`](a2a-server/prisma/schema.prisma)):

| Модель | Назначение | Ключевые поля |
|--------|------------|---------------|
| `Client` | Пользователь системы | id, email, apiKey, isActive |
| `Project` | Проект клиента | gitUrl, branch, status, indexingProgress |
| `ArchitecturalFeature` | Архитектурные особенности | feature, category |
| `Session` | Диалог сессии | projectId, title, status, context |
| `Task` | Задача в сессии | type, status, target, progress |
| `Message` | Сообщение в сессии | direction, role, content, promiseId |
| `Request` | Async запрос | promiseId, status, context, codeBlocks, result |
| `File` | Файл проекта | path, language, linesCount, hash |
| `GraphEntity` | Сущность графа знаний | type, name, path, metadata |
| `GraphRelation` | Связь между сущностями | fromId, toId, type |
| `Embedding` | Векторное представление | chunkType, lineStart, lineEnd, content |
| `IndexingJob` | Задача индексации | type, payload, status, progress |

**Enums**:
- `ProjectStatus`: PENDING_CLONE → CLONING → PENDING_INDEXING → INDEXING → INDEXED → ERROR
- `SessionStatus`: CREATED, ACTIVE, PAUSED, COMPLETED, ERROR
- `TaskType`: ANALYZE, REFACTOR, TEST, DOCUMENT, FIX, CREATE, DELETE
- `EntityType`: MODEL, CONTROLLER, SERVICE, REPOSITORY, MIDDLEWARE, VUE_COMPONENT, COMPOSABLE, PHP, JS, CONFIG, OTHER
- `RelationType`: USES, CREATES, EXTENDS, IMPLEMENTS, IMPORTS, BELONGS_TO, HAS_MANY, HAS_ONE, BELONGS_TO_MANY
- `ChunkType`: FILE, CLASS, METHOD, FUNCTION, COMPONENT, BLOCK, SECTION

### Нейроны

**Всего нейронов**: 87 файлов в [`src/neurons/`](a2a-server/src/neurons/)

**Категории нейронов**:

| Категория | Примеры | Количество |
|-----------|---------|------------|
| **Detect (обнаружение)** | detect-n1-queries, detect-god-objects, detect-xss-vulnerabilities | ~45 |
| **Suggest (предложения)** | suggest-eager-loading, suggest-composition-api, suggest-csrf-fix | ~30 |
| **Generate (генерация)** | generate-controller, generate-model, generate-vue-component | ~10 |
| **Apply (применение)** | apply-eager-loading, apply-form-request | 2 |

**Специализация по стеку**:
- Laravel: detect-eloquent-*, detect-blade-*, detect-csrf-*, detect-mass-assignment-*
- Vue.js: detect-vue-*, detect-prop-drilling, detect-options-api
- Tailwind: detect-tailwind-*, suggest-tailwind-*
- TypeScript: detect-typescript-*, suggest-typescript-*
- Inertia.js: detect-inertia-*, suggest-inertia-*
- Security: detect-xss-*, detect-sql-injection, detect-secrets-in-code
- Accessibility: detect-a11y-*, suggest-a11y-*

---

## 2. Клиент (a2a-client/)

### Что реализовано

**Пакеты** ([`packages/`](a2a-client/packages/)):

| Пакет | Назначение | Файлы |
|-------|------------|-------|
| `@a2a/api-client` | HTTP клиент с async протоколом | async-client.js, protocol.js, index.js |
| `@a2a/rag` | RAG индексация и поиск | indexer.js, searcher.js, chunk-manager.js |
| `@a2a/agent` | Агент для работы с файлами | fs-reader.js, git-ops.js, card-manager.js |
| `@a2a/fs-utils` | Утилиты файловой системы | file-scanner.js, glob-matcher.js, ignore-detector.js |

**Web интерфейс** ([`web/`](a2a-client/web/)):
- `index.html` — SPA с навигацией
- `js/app.js` — основное приложение
- `js/projects.js` — управление проектами
- `js/sessions.js` — управление сессиями (Promise protocol)
- `js/explorer.js` — проводник по файлам
- `js/storage.js` — локальное хранилище
- `css/style.css` — стили

**E2E тесты** ([`e2e/`](a2a-client/e2e/)):
- 68 тестов в 5 файлах
- Page Object Model
- Playwright с моками API
- Promise Protocol тестирование

### RAG

**Модуль** ([`packages/rag/`](a2a-client/packages/rag/)):

**RAGIndexer** (`indexer.js`):
- Индексация файлов проекта
- Извлечение чанков (классы, методы, функции)
- Поддержка PHP и JavaScript/TypeScript
- AST-aware парсинг

**RAGSearcher** (`searcher.js`):
- Семантический поиск по коду
- Гибридный поиск (semantic + lexical)
- Ранжирование результатов

**ChunkManager** (`chunk-manager.js`):
- Управление чанками кода
- Разбиение на логические блоки
- Метаданные чанков

### API Client

**Модуль** ([`packages/api-client/`](a2a-client/packages/api-client/)):

**AsyncClient** (`async-client.js`):
- `PromisePoller` — polling для async результатов
- Интервал: 5 сек, макс. попыток: 720 (1 час)
- Callbacks: onComplete, onError, onStatus
- Методы: createRequest, getRequestStatus, getRequestResult

**Protocol** (`protocol.js`):
- `buildNewTaskContext(sessionId, newTask, architecturalFeatures)` — контекст для новой задачи
- `buildContinueContext(sessionId)` — контекст для продолжения
- `buildConfirmContext(sessionId)` — контекст для подтверждения
- `serializeMessage(context, files)` — сериализация в markdown
- `parseMessage(text)` — парсинг из markdown
- `serializeFileBlock(path, content, startLine, endLine)` — блок файла
- `parseFileBlock(text)` — парсинг блока файла

---

## 3. Протокол

### Что описано

**Документация** ([`a2a-client/docs/requirements.md`](a2a-client/docs/requirements.md)):

**Ключевые принципы**:
1. Клиент отправляет `context` + `codeBlocks`
2. Сервер обрабатывает, обновляет `context`, добавляет задачи
3. Сервер НЕ хранит состояние — граф циркулирует в context
4. `new_task` ВСЕГДА циркулирует в context
5. Цикл повторяется до `outcome: "completed"`

**Поддерживаемые технологии**:
- Laravel 11.x (backend)
- Inertia.js (frontend-backend связь)
- Vue.js 3.x (frontend)
- Tailwind CSS 3.x
- i18n (интернационализация)
- Vitest (unit тесты)
- Playwright (e2e тесты)

### Формат запросов

**Структура запроса**:
```json
{
  "context": {
    "new_task": ["Задача пользователя"],
    "graph": { "entities": [], "relations": [] },
    "frameworks": { "frontend": "vue", "backend": "laravel" }
  },
  "codeBlocks": [
    { "path": "package.json", "content": "..." },
    { "path": "app/Models/User.php", "content": "..." }
  ]
}
```

**Структура ответа**:
```json
{
  "outcome": "graph_incomplete" | "completed" | "failed",
  "context": {
    "new_task": ["Задача пользователя"],
    "graph": { ... },
    "questions": ["Какая модель хранит пользователей?"],
    "request_files": ["app/Models/User.php"],
    "frameworks": { ... }
  },
  "activated_neuron_ids": ["detect-n1-queries", "suggest-eager-loading"],
  "injected_content": "..."
}
```

**Markdown формат** (protocol.js):
```
```context
{"version":"1.0","session_id":"...","new_task":["..."]}
```

```file:app/Models/User.php
<?php
// content...
```
```

---

## 4. End-to-end

### Что работает

**Сервер**:
- ✅ HTTP сервер с Express
- ✅ WebSocket для сессий
- ✅ Async протокол (Promise/Polling)
- ✅ Request Processor — обработка очереди
- ✅ Извлечение фреймворков из package.json/composer.json
- ✅ Распознавание сущностей из кода
- ✅ Построение графа знаний
- ✅ Активация нейронов по триггерам
- ✅ Генерация вопросов при неполном графе
- ✅ Graceful shutdown

**Клиент**:
- ✅ API клиент с Promise/Polling
- ✅ Protocol handler (markdown format)
- ✅ RAG индексация и поиск
- ✅ Web интерфейс (Projects, Sessions, Explorer)
- ✅ E2E тесты (68 тестов)
- ✅ File scanner с ignore детекцией

**Протокол**:
- ✅ Итеративный обмен (context → graph_incomplete → codeBlocks → completed)
- ✅ Сохранение new_task в context
- ✅ Framework detection
- ✅ Entity recognition

### Что НЕ работает

**Сервер**:
- ⚠️ ML модели (embedding.service.ts) — заглушки, нет реальной интеграции
- ⚠️ Plexe AI клиент — не подключен
- ⚠️ Git операции — не реализованы (только заглушки)
- ⚠️ Индексация проекта — не запускается автоматически

**Клиент**:
- ⚠️ RAG searcher — нет реального поиска по embeddings
- ⚠️ Agent — ограниченная функциональность
- ⚠️ Web UI — нет реального подключения к серверу (моки)

**Протокол**:
- ⚠️ Граф знаний — минимальная логика проверки полноты
- ⚠️ Нейроны — только активация, нет выполнения
- ⚠️ Request files — генерируются, но не используются

---

## Выводы

### Готово к использованию

1. **Серверная инфраструктура**:
   - Express сервер с middleware
   - Prisma ORM + PostgreSQL
   - WebSocket поддержка
   - Async протокол (Promise/Polling)

2. **Клиентская инфраструктура**:
   - API клиент с polling
   - Protocol handler
   - Web интерфейс
   - E2E тесты

3. **Модели данных**:
   - Полная схема Prisma
   - Миграции
   - Seed данные

4. **База нейронов**:
   - 87 нейронов с метаданными
   - Категоризация по типам и стеку
   - Система активации

### Требует доработки

1. **ML компоненты**:
   - Интеграция реальных embedding моделей
   - Подключение Plexe AI или аналога
   - Реализация семантического поиска

2. **Граф знаний**:
   - Улучшение логики проверки полноты
   - Извлечение связей между сущностями
   - Визуализация графа

3. **Нейроны**:
   - Реализация выполнения нейронов
   - Интеграция с external AI
   - Генерация кода

4. **Git операции**:
   - Клонирование проектов
   - Отслеживание изменений
   - Применение патчей

### Отсутствует

1. **Интеграция с AI провайдерами**:
   - OpenAI / Anthropic / Local LLM
   - Prompt templates
   - Response parsing

2. **Реальное выполнение задач**:
   - Рефакторинг кода
   - Генерация тестов
   - Исправление багов

3. **Production готовность**:
   - Docker compose (есть, но не протестирован)
   - CI/CD pipeline
   - Мониторинг и логирование

4. **Документация API**:
   - OpenAPI/Swagger
   - Примеры использования
   - SDK для клиентов
