# Требования к A2A (Agent-to-Agent) приложению

**Индекс документации:** [docs/README.md](../../docs/README.md)

**Протокол:** [docs/protocol/README.md](../../docs/protocol/README.md)

---

## Содержание

1. [Введение и обзор](#1-введение-и-обзор)
2. [Технологический стек анализируемых проектов](#2-технологический-стек-анализируемых-проектов)
3. [Протокол общения с сервером](#3-протокол-общения-с-сервером)
4. [ML модели для анализа кода](#4-ml-модели-для-анализа-кода)
5. [Форматы данных](#5-форматы-данных)
6. [Диаграммы взаимодействия](#6-диаграммы-взаимодействия)
7. [Примеры обмена сообщениями](#7-примеры-обмена-сообщениями)
8. [Метрики качества поиска](#8-метрики-качества-поиска)

---

## 1. Введение и обзор

### 1.1 Назначение приложения

A2A (Agent-to-Agent) приложение — это клиентская система для анализа программных проектов. Приложение работает на стороне клиента и обеспечивает интеллектуальный анализ кодовой базы через диалоговые сессии.

### 1.2 Ключевые функции

- **Анализ проектов по списку** — последовательная или параллельная обработка множества проектов
- **Диалоговые сессии** — открытие и управление сессиями взаимодействия с проектами
- **Интеллектуальный поиск** — ML-основанный поиск и ранжирование релевантного кода
- **Синхронизация файлов** — отслеживание и применение изменений к файлам проекта

### 1.3 Архитектурная схема

```
┌─────────────────────────────────────────────────────────────┐
│                    A2A Client Application                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Project    │  │  Session    │  │  ML Search Engine   │  │
│  │  Manager    │  │  Manager    │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              Protocol Handler                          │  │
│  │         - JSON Request/Response                        │  │
│  │         - Context Management                           │  │
│  │         - File Block Management                        │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ JSON Protocol
                           ▼
               ┌────────────────────────┐
               │   A2A Server Agent     │
               └────────────────────────┘
```

---

## 2. Технологический стек анализируемых проектов

### 2.1 Поддерживаемые технологии

Приложение специализируется на анализе проектов со следующим технологическим стеком:

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Laravel** | 11.x | Backend фреймворк |
| **Inertia.js** | Latest | Связка frontend и backend |
| **Vue.js** | 3.x | Frontend фреймворк |
| **Tailwind CSS** | 3.x | CSS фреймворк |
| **i18n** | - | Интернационализация |
| **Vitest** | Latest | Unit тестирование |
| **Playwright** | Latest | E2E тестирование |

### 2.2 Структура типичного проекта

```
project-root/
├── app/                    # Laravel application
│   ├── Http/Controllers/   # Controllers
│   ├── Models/             # Eloquent models
│   └── Services/           # Business logic
├── routes/                 # Route definitions
│   ├── web.php
│   └── api.php
├── resources/
│   ├── js/                 # Vue.js components
│   │   ├── Components/
│   │   ├── Pages/
│   │   └── composables/
│   └── lang/               # i18n translations
├── tests/
│   ├── Unit/               # Vitest unit tests
│   └── E2E/                # Playwright e2e tests
└── tailwind.config.js      # Tailwind configuration
```

### 2.3 Особенности анализа

Приложение должно учитывать специфику стека:

- **Inertia.js** — анализ props, page components, shared data
- **Vue 3** — Composition API, reactive state, lifecycle hooks
- **Laravel 11** — routes, middleware, policies, services
- **Tailwind CSS** — utility classes, custom configurations
- **i18n** — ключи переводов, pluralization, locale switching
- **Vitest** — test coverage, mocking, assertions
- **Playwright** — page objects, selectors, test flows

---

## 3. Протокол общения с сервером

### 3.1 Обзор протокола

**Документация протокола:** [docs/protocol/README.md](../../docs/protocol/README.md)

**Ключевые принципы:**
- Клиент отправляет `context` + `codeBlocks`
- Сервер обрабатывает, обновляет `context`, добавляет задачи
- Сервер НЕ хранит состояние
- `new_task` ВСЕГДА циркулирует в context
- Цикл повторяется до `outcome: "completed"`

### 3.2 Структура запроса

```json
{
  "context": {
    "new_task": ["Задача пользователя"],
    "graph": { ... },
    "frameworks": { ... }
  },
  "codeBlocks": [ ... ]
}
```

### 3.3 Структура ответа

```json
{
  "outcome": "graph_incomplete" | "completed" | "failed",
  "context": {
    "new_task": ["Задача пользователя"],
    "graph": { ... },
    "questions": [ ... ],
    "request_files": [ ... ],
    "frameworks": { ... }
  }
}
```

**Важно:** `new_task` возвращается сервером в context и должен отправляться клиентом в следующем запросе!

---

## 4. ML модели для анализа кода

### 4.1 Архитектура ML компонентов

```
┌─────────────────────────────────────────────────────────────────┐
│                    ML Search Engine                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Indexing Layer  │  │  Embedding Layer │  │ Search Layer  │  │
│  │                  │  │                  │  │               │  │
│  │  - Lexer         │  │  - Code Encoder  │  │  - Semantic   │  │
│  │  - Parser        │  │  - Text Encoder  │  │  - Lexical    │  │
│  │  - AST Builder   │  │  - Hybrid Model  │  │  - Hybrid     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                    │          │
│           └─────────────────────┼────────────────────┘          │
│                                 │                               │
│                    ┌────────────┴────────────┐                  │
│                    │    Scoring Engine       │                  │
│                    │                         │                  │
│                    │  - Similarity Score     │                  │
│                    │  - Length Multiplier    │                  │
│                    │  - Context Weighting    │                  │
│                    │  - Final Ranking        │                  │
│                    └─────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Модели анализа

#### 4.2.1 Code Embedding Model

**Назначение:** Векторное представление кода для семантического поиска

**Требования:**
- Поддержка PHP (Laravel) и JavaScript/TypeScript (Vue)
- Учет структуры кода (AST-aware)
- Сохранение семантических связей

**Параметры:**
| Параметр | Значение | Описание |
|----------|----------|----------|
| Dimension | 768 | Размерность вектора |
| Max Length | 512 tokens | Максимальная длина входа |
| Normalization | L2 | Нормализация векторов |

#### 4.2.2 Text Embedding Model

**Назначение:** Векторное представление текстовых запросов

**Требования:**
- Мультиязычность (с учетом i18n)
- Понимание технической терминологии
- Поддержка контекстных запросов

#### 4.2.3 Hybrid Search Model

**Назначение:** Комбинация семантического и лексического поиска

**Компоненты:**
- Semantic Search — на основе embeddings
- Lexical Search — BM25, TF-IDF
- Reranker — финальное ранжирование

---

## 5. Форматы данных

### 5.1 Граф знаний

```json
{
  "graph": {
    "entities": [
      { "id": "model-user", "type": "MODEL", "name": "User", "path": "app/Models/User.php" }
    ],
    "relations": [
      { "from": "model-user", "to": "model-post", "type": "hasMany" }
    ]
  }
}
```

### 5.2 Типы сущностей

| Тип | Описание | Пример |
|-----|----------|--------|
| MODEL | Eloquent модель | User, Post |
| CONTROLLER | Контроллер | UserController |
| SERVICE | Сервисный класс | UserService |
| REQUEST | FormRequest | UserRequest |
| VUE_COMPONENT | Vue компонент | UserForm.vue |
| VUE_PAGE | Vue страница | UsersIndex.vue |

---

## 6. Диаграммы взаимодействия

### 6.1 Итеративный обмен

```
┌──────────────┐                              ┌──────────────┐
│    КЛИЕНТ    │                              │    СЕРВЕР    │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │  context: { new_task }                      │
       │  codeBlocks: [package.json, composer.json] │
       │ ──────────────────────────────────────────►│
       │                                             │
       │                    outcome: "graph_incomplete"
       │                    context: { graph, questions }
       │ ◄──────────────────────────────────────────│
       │                                             │
       │  context: { graph }                         │
       │  codeBlocks: [найденные файлы]              │
       │ ──────────────────────────────────────────►│
       │                                             │
       │                    outcome: "completed"
       │ ◄──────────────────────────────────────────│
       ▼                                             ▼
```

---

## 7. Примеры обмена сообщениями

### 7.1 Первый запрос

```json
POST /api/v1/requests
{
  "context": {
    "new_task": ["Добавить валидацию email"]
  },
  "codeBlocks": [
    { "path": "package.json", "content": "..." },
    { "path": "composer.json", "content": "..." }
  ]
}
```

### 7.2 Ответ сервера

```json
{
  "outcome": "graph_incomplete",
  "context": {
    "graph": { "entities": [], "relations": [] },
    "questions": ["Какая модель хранит пользователей?"],
    "request_files": ["app/Models/User.php"]
  }
}
```

### 7.3 Следующий запрос

```json
{
  "context": {
    "graph": { "entities": [], "relations": [] }
  },
  "codeBlocks": [
    { "path": "app/Models/User.php", "content": "..." }
  ]
}
```

---

## 8. Метрики качества поиска

### 8.1 Формула ранжирования

```
final_score = base_similarity × length_multiplier × context_weight

где:
  base_similarity = cosine_similarity(query_embedding, code_embedding)
  
  length_multiplier = 1 + log(1 + query_length / base_factor)
  
  context_weight = Σ(context_factors) / count(factors)
```

### 8.2 Принцип ранжирования

> **Ключевой принцип:** Чем длиннее запрос, тем больше баллов умножено на коэффициент сходства.

---

## Ссылки

- **Протокол:** [docs/protocol/README.md](../../docs/protocol/README.md)
- **Нейроны:** [docs/neurons/README.md](../../docs/neurons/README.md)
- **Граф:** [docs/graph-local-config.md](../../docs/graph-local-config.md)
