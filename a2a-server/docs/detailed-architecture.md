# A2A Server - Детальная Архитектура

> Детальная документация компонента `a2a-server` - stateless HTTP сервера для обработки A2A запросов.
>
> **Связанная документация:**
> - [SERVER-ARCHITECTURE.md](../../docs/new-request-flow/SERVER-ARCHITECTURE.md) - Server-centric документация
> - [ARCHITECTURE.md](../../docs/new-request-flow/ARCHITECTURE.md) - общая архитектура системы
> - [PROTOCOL.md](../../docs/new-request-flow/PROTOCOL.md) - протокол взаимодействия
> - [entry-points.md](./entry-points.md) - точки входа
> - [action-api.md](./action-api.md) - API действий
> - [SERVER-COMPONENTS.md](../../docs/architecture/SERVER-COMPONENTS.md) - компоненты сервера
> - [a2a-server-actions-analysis.md](../../docs/architecture/a2a-server-actions-analysis.md) - анализ Actions

---

## Содержание

1. [Обзор](#обзор)
2. [Архитектура Серверных Эндпоинтов](#архитектура-серверных-эндпоинтов)
3. [Actions vs AI-Actions](#actions-vs-ai-actions)
4. [Интеграция с External AI Hub](#интеграция-с-external-ai-hub)
5. [Маппинг Симуляций на Actions](#маппинг-симуляций-на-actions)
6. [Операционные Заметки](#операционные-заметки)
7. [Диаграммы](#диаграммы)

---

## Обзор

### Позиционирование в Системе

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Web UI    │────▶│  Client API  │────▶│ a2a-server  │────▶│ External AI Hub │
│  (port 5173)│     │ (port 3001)  │     │ (port 3000) │     │  (ai-integration)│
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  PostgreSQL   │
                                        │   + Redis     │
                                        └───────────────┘
```

### Ключевые Принципы

| Принцип | Описание |
|---------|----------|
| **Stateless** | Сервер не хранит состояние сессий, только обрабатывает запросы |
| **Action-key Shape** | Все `result`/`execute` оборачиваются в ключ с названием действия |
| **Iterative Protocol** | Цикл: `execute` → выполнение → `result` → следующий шаг |
| **Async AI** | Неблокирующие запросы к LLM через `promiseId` |
| **Timer-based Processing** | Пolling pending requests каждые 5 секунд |

---

## Архитектура Серверных Эндпоинтов

### Маршрутизация Запросов

```
POST /api/v1/invoke
        │
        ▼
┌───────────────────┐
│   invoke.service  │
│   (парсинг input) │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  request.service  │
│  (создание в БД)  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────┐
│ request-processor.service │
│  (timer-based polling)    │
└─────────────┬─────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌─────────┐ ┌──────────┐
│Actions│ │Neurons  │ │AI-Actions│
└───────┘ └─────────┘ └──────────┘
```

### Основные Endpoints

#### Async Protocol (Рекомендуется)

| Endpoint | Method | Auth | Описание |
|----------|--------|------|----------|
| `/api/v1/requests` | POST | Bearer | Создать запрос, вернуть `promiseId` |
| `/api/v1/requests/:id/status` | GET | Bearer | Получить статус запроса |
| `/api/v1/requests/:id/result` | GET | Bearer | Получить результат (completed/failed) |
| `/api/v1/requests/:id` | DELETE | Bearer | Отменить запрос |

#### Legacy Protocol

| Endpoint | Method | Auth | Описание |
|----------|--------|------|----------|
| `/api/v1/invoke` | POST | Bearer/Basic | Создать запрос (sync-like) |

#### SSE (Server-Sent Events)

| Endpoint | Auth | Описание |
|----------|------|----------|
| `/api/v1/sse/:sessionId` | Bearer | Events для конкретной сессии |
| `/api/v1/sse` | Bearer | Global events |

### Health Endpoints (No Auth)

| Endpoint | Описание |
|----------|----------|
| `/health` | Базовый health check |
| `/api/v1/health/live` | Liveness probe (Kubernetes) |
| `/api/v1/health/ready` | Readiness probe + проверка БД |
| `/api/v1/health/database` | Детальная проверка БД |

### Обработка Запросов через Actions

```mermaid
flowchart TD
    A[Client Request] --> B{Request Type}
    B -->|Action Task| C[Action Registry]
    B -->|AI Task| D[Phase Machine]
    B -->|Auto-detect| E[Neuron Activator]

    C --> F[Action Executor]
    F --> G[Step 1: detect]
    G --> H[Step 2: resolve]
    H --> I[Step 3: apply]
    I --> J[Step 4: cleanup]
    J --> K[Completed]

    D --> L[discovery phase]
    L --> M[recognition phase]
    M --> N[analysis phase]
    N --> O[action phase]
    O --> K

    E --> P{Neuron Match?}
    P -->|Yes| Q[Neuron Handler]
    P -->|No| D
    Q --> K
```

---

## Actions vs AI-Actions

### Actions (Server-Driven)

**Определение:** Hardcoded последовательность шагов, где сервер полностью управляет выполнением.

#### Структура Action Definition

```yaml
# Пример: fix-vue-imports
id: fix-vue-imports
name: Fix Vue Imports
keywords:
  - vue
  - imports
  - fix

steps:
  - name: detect
    description: Detect broken imports in Vue files

  - name: resolve
    description: Resolve correct import paths

  - name: apply
    description: Apply fixes to files

  - name: cleanup
    description: Remove unused imports

execute:
  script: |
    // JavaScript код выполнения
    const results = await detectBrokenImports();
    return { results };
```

#### Жизненный Цикл Action

```
task_request
    │
    ▼
action_proposal  ←──── Показываем пользователю что будет делаться
    │
    ▼
approve_action   ←──── Пользователь подтверждает
    │
    ▼
step_result      ←──── Результат каждого шага
    │
    ▼
completed
```

#### Встроенные Actions

| Action | Назначение | Шаги |
|--------|------------|------|
| `fix-vue-imports` | Исправление импортов Vue | detect → resolve → apply → cleanup |
| `auto-ai` | Автоматический AI анализ | analyze → suggest → apply |
| `coder` | Генерация кода | plan → generate → review |

### AI-Actions (LLM-Driven)

**Определение:** Динамические шаги, где LLM выбирает следующее действие на основе контекста.

#### Структура AI-Action

```yaml
id: ai-session-context
type: ai-action
template: |
  You are an AI assistant helping with {task}.

  Available actions:
  {availableActions}

  Context:
  {context}

  Choose the next action or ask for clarification.

actions:
  - read-file
  - write-file
  - execute-command
  - ask-question
```

#### Различия в Обработке

| Аспект | Actions | AI-Actions |
|--------|---------|------------|
| **Control** | Сервер управляет | LLM выбирает |
| **Steps** | Фиксированные | Динамические |
| **Prompt** | Минимальный | Полный context |
| **Cost** | Низкая (No-AI режим) | Зависит от LLM |
| **Speed** | Быстро | Зависит от LLM |
| **Use Case** | CI/CD, повторяемые задачи | Сложные, творческие задачи |

### DSL для Action Definitions

#### Форматы

| Формат | Расположение | Статус |
|--------|--------------|--------|
| YAML DSL | `definitions/yaml/actions/*.yaml` | Canonical |
| Markdown | `definitions/*.md` | Legacy |

#### Композиция через Mixins

```yaml
# Использование миксинов
mixins:
  - file-collector    # Сбор файлов по паттернам
  - code-analyzer     # Анализ кода
  - patch-applier     # Применение изменений

steps:
  - name: collect
    mixin: file-collector
    config:
      patterns: ["**/*.vue"]

  - name: analyze
    mixin: code-analyzer
    config:
      rules: ["import-resolution"]
```

#### Доступные Mixins

| Mixin | Назначение |
|-------|------------|
| `file-collector` | Сбор файлов по glob паттернам |
| `code-analyzer` | Статический анализ кода |
| `patch-applier` | Применение diff-патчей |

---

## Интеграция с External AI Hub

### Архитектура Интеграции

```
┌─────────────────────────────────────────────────────────────┐
│                      a2a-server                             │
│  ┌───────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ context-parser│───▶│ request.md   │───▶│ llm-adapter │  │
│  │               │    │              │    │             │  │
│  └───────────────┘    └──────────────┘    └──────┬──────┘  │
└───────────────────────────────────────────────────┼─────────┘
                                                    │
                              POST /api/chat        │
                              X-Promise: <id>       ▼
                                                    │
┌───────────────────────────────────────────────────┼─────────┐
│              ai-integration/proxy                 │         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┴──────┐  │
│  │ promises.py │───▶│proxy_handler│───▶│ ollama_manager │  │
│  │             │◀───│             │◀───│                │  │
│  └─────────────┘    └─────────────┘    └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Формирование LLM-Промптов

#### Pipeline Трансформаций

```
request.json
    │
    ▼
server-transforms-request.json  (server preprocessing)
    │
    ▼
request.md  (готов для LLM)
    │
    ▼
[LLM Processing]
    │
    ▼
response.md  (LLM output)
    │
    ▼
server-transforms-response.json  (server postprocessing)
    │
    ▼
response.json
```

#### Структура request.md

```markdown
# Task
{task_description}

# Context
{session_context}

# Available Actions
{action_definitions}

# History
{execution_history}

# Current State
{current_phase}
```

### Асинхронный Flow с promiseId

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Proxy as AI Hub Proxy
    participant LLM

    Client->>Server: POST /api/v1/requests
    Server->>Proxy: POST /api/chat (X-Promise: uuid)
    Proxy-->>Server: 202 Accepted {promiseId}
    Server-->>Client: {promiseId, status: pending}

    loop Polling
        Client->>Server: GET /api/v1/requests/:id/status
        Server->>Proxy: GET /promise/:id
        Proxy-->>Server: {status: processing}
        Server-->>Client: {status: processing}
    end

    par LLM Processing
        Proxy->>LLM: Generate response
        LLM-->>Proxy: response.md
    end

    Proxy-->>Server: Webhook/Callback
    Server->>Server: Process response

    Client->>Server: GET /api/v1/requests/:id/result
    Server-->>Client: {status: completed, result}
```

### Поддерживаемые LLM Провайдеры

| Провайдер | Конфигурация | Адаптер |
|-----------|--------------|---------|
| Ollama | `OLLAMA_MODEL`, `AI_HUB_URL` | `ollama-adapter.ts` |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | `llm-adapter.ts` |
| Placeholder | `LLM_PROVIDER=placeholder` | `llm-adapter.ts` |

### Конфигурация Подключения

```typescript
// Ollama Adapter
{
  provider: 'ollama',
  model: 'qwen3:8b',
  url: 'http://localhost:11434',
  pollIntervalMs: 2000,
  pollTimeoutMs: 120000
}

// OpenAI Adapter
{
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY
}
```

---

## Маппинг Симуляций на Actions

### Структура Симуляции

```
simulations/
└── {simulation-name}/
    ├── request.json                    # Входной запрос
    ├── server-transforms-request.json  # Трансформации сервера
    ├── request.md                      # LLM промпт
    ├── response.md                     # LLM ответ
    ├── server-transforms-response.json # Трансформации ответа
    └── response.json                   # Итоговый ответ
```

### Action-key Shape (Canonical Format)

**Правильно:**
```typescript
// Result с action-type ключом
{ result: { "read-file": { path: "...", content: "..." } } }

// Execute с action-type ключом
{ execute: { "script": { input: {}, output: "...", code: "..." } } }
```

**Неправильно (устаревший формат):**
```typescript
// Неверно: плоская структура
{ result: { content: "..." } }

// Неверно: generic action поле
{ execute: { action: "read-file", file: "..." } }
```

### Типы Actions

#### UI-Only Types

| Тип | Назначение | Пример |
|-----|------------|--------|
| `form` | Интерактивные формы | Подтверждение действия |
| `message` | Отображение сообщений | Уведомление о завершении |

#### Client Types (выполняются на клиенте)

| Тип | Назначение | Executor |
|-----|------------|----------|
| `script` | Выполнение JS кода | `script-runner` пакет |
| `rag-search` | RAG поиск | `rag` пакет |
| `read-file` | Чтение файла | `fs-utils` пакет |
| `write-file` | Запись файла | `fs-utils` пакет |
| `execute-command` | Выполнение shell | `terminal` пакет |

### Скрипты Работы с Симуляциями

| Скрипт | Назначение |
|--------|------------|
| `sim-run.ts` | Запуск симуляции |
| `sim-create.ts` | Создание новой симуляции |
| `sim-validate.ts` | Валидация формата |
| `sim-compare.ts` | Сравнение симуляций |
| `sim-report.ts` | Генерация отчетов |

### Примеры Маппинга

```typescript
// Симуляция: user-onboarding
{
  "simulation": "user-onboarding",
  "actions": [
    { "type": "form", "purpose": "collect_user_info" },
    { "type": "script", "purpose": "create_user_profile" },
    { "type": "message", "purpose": "welcome_message" }
  ]
}

// Симуляция: code-refactoring
{
  "simulation": "code-refactoring",
  "actions": [
    { "type": "rag-search", "purpose": "find_relevant_patterns" },
    { "type": "read-file", "purpose": "analyze_current_code" },
    { "type": "script", "purpose": "generate_refactoring_plan" },
    { "type": "write-file", "purpose": "apply_changes" }
  ]
}
```

---

## Операционные Заметки

### Environment Variables

#### Обязательные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/a2a_server` |
| `JWT_SECRET` | Минимум 32 символа | `your-super-secret-key` |

#### Опциональные (с значениями по умолчанию)

| Переменная | Default | Описание |
|------------|---------|----------|
| `NODE_ENV` | `development` | development / production / test |
| `PORT` | `3000` | HTTP сервер порт |
| `HOST` | `localhost` | Хост для сервера |
| `JWT_EXPIRES_IN` | `1h` | JWT токен expires |
| `LOG_LEVEL` | `info` | error / warn / info / debug |

#### Переменные для Разработки

| Переменная | Значение | Описание |
|------------|----------|----------|
| `SKIP_AUTH` | `1` | Полностью отключает аутентификацию |
| `A2A_DEFAULT_EMAIL` | `dev@localhost` | Dev пользователь |
| `A2A_DEFAULT_PASSWORD` | `dev` | Dev пароль |

#### LLM/AI Integration

| Переменная | Описание |
|------------|----------|
| `LLM_PROVIDER` | `ollama` / `openai` / auto |
| `AI_HUB_URL` | URL ai-integration proxy |
| `OLLAMA_MODEL` | `qwen3:8b` |
| `OPENAI_API_KEY` | OpenAI API ключ |
| `POLL_INTERVAL_MS` | `2000` - интервал polling |
| `POLL_TIMEOUT_MS` | `120000` - таймаут polling |

### Порты

| Порт | Назначение |
|------|------------|
| `3000` | HTTP сервер (по умолчанию) |
| `3001` | WebSocket порт |
| `5432` | PostgreSQL (docker) |
| `6379` | Redis (docker) |

### Запуск в Dev-режиме

#### Требования

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 с pgvector

#### Команды

```bash
# 1. Установка зависимостей
npm install

# 2. Копировать env
cp .env.example .env

# 3. Запустить PostgreSQL и Redis
npm run docker:up

# 4. Генерация Prisma клиента
npm run prisma:generate

# 5. Применить миграции
npm run prisma:migrate

# 6. Запуск dev сервера
npm run dev              # С auth
npm run dev:no-auth      # Без auth (SKIP_AUTH=1)
```

#### Docker Compose

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  app:
    build: .
    ports: ["3000:3000", "3001:3001"]
```

### Health Checks

#### Endpoints

| Endpoint | Что проверяется |
|----------|-----------------|
| `/health/live` | Сервер запущен |
| `/health/ready` | БД доступна |
| `/health/database` | Детальная проверка БД |

#### Формат Ответа

```typescript
// GET /api/v1/health/ready
{
  success: boolean,
  data: {
    ready: boolean,
    database: {
      status: 'healthy' | 'unhealthy',
      latency?: number,  // ms
      error?: string
    }
  }
}
```

---

## Диаграммы

### Общая Архитектура Системы

```mermaid
flowchart TB
    subgraph Client["Client Side"]
        Web[Web UI port 5173]
    end

    subgraph API["Client API"]
        ClientAPI[port 3001]
    end

    subgraph Server["a2a-server port 3000"]
        Routes[Routes Layer]
        Services[Services Layer]
        Actions[Actions Layer]
        Protocol[Protocol Layer]

        Routes --> Services
        Services --> Actions
        Services --> Protocol
    end

    subgraph Storage["Storage"]
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph AI["External AI"]
        AIHub[AI Hub Proxy]
        Ollama[Ollama]
        OpenAI[OpenAI]
    end

    Web --> ClientAPI
    ClientAPI --> Routes
    Services --> Postgres
    Services --> Redis
    Protocol --> AIHub
    AIHub --> Ollama
    AIHub --> OpenAI
```

### Обработка Запроса

```mermaid
sequenceDiagram
    participant Client
    participant Routes
    processor as Request Processor
    participant Services
    participant Actions
    participant AI as External AI
    participant DB as Database

    Client->>Routes: POST /api/v1/requests
    Routes->>Services: createRequest()
    Services->>DB: INSERT request
    DB-->>Services: requestId
    Services-->>Client: {promiseId}

    loop Every 5 seconds
        processor->>DB: getPendingRequests()
        DB-->>processor: requests[]

        alt Action Request
            processor->>Actions: executeAction()
            Actions->>Actions: Run steps
            Actions-->>processor: result
        else AI Request
            processor->>AI: POST /api/chat
            AI-->>processor: promiseId
            processor->>AI: Poll result
            AI-->>processor: response
        end

        processor->>DB: UPDATE status
    end

    Client->>Routes: GET /api/v1/requests/:id/result
    Routes->>DB: SELECT result
    DB-->>Routes: result
    Routes-->>Client: {status, result}
```

### Action vs AI-Action Flow

```mermaid
flowchart TD
    A[Task Request] --> B{Detection}

    B -->|Keywords match| C[Action]
    B -->|No match| D[Neuron Analysis]
    B -->|Force AI| E[AI-Action]

    C --> F[Load Definition]
    F --> G[Execute Steps]
    G --> H[Step 1]
    H --> I[Step 2]
    I --> J[Step N]
    J --> K[Completed]

    D --> L{Neuron Match?}
    L -->|Yes| M[Neuron Handler]
    L -->|No| E
    M --> K

    E --> N[Build Context]
    N --> O[Send to LLM]
    O --> P[Parse Response]
    P --> Q{Action Required?}
    Q -->|Yes| R[Execute Action]
    Q -->|No| S[Ask User]
    R --> O
    S --> K
```

---

## Ссылки

- [SERVER-ARCHITECTURE.md](../../docs/new-request-flow/SERVER-ARCHITECTURE.md) - Server-centric документация
- [ARCHITECTURE.md](../../docs/new-request-flow/ARCHITECTURE.md) - Общая архитектура A2A
- [PROTOCOL.md](../../docs/new-request-flow/PROTOCOL.md) - Протокол взаимодействия
- [entry-points.md](./entry-points.md) - Точки входа в систему
- [action-api.md](./action-api.md) - API действий
- [system-impact.md](./system-impact.md) - Влияние на систему
- [SERVER-COMPONENTS.md](../../docs/architecture/SERVER-COMPONENTS.md) - Компоненты сервера
- [a2a-server-actions-analysis.md](../../docs/architecture/a2a-server-actions-analysis.md) - Анализ Actions
