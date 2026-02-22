# A2A Coding Orchestrator

**Система для анализа кода с нейронами и графом знаний.**

---

## Что это

A2A — серверно-клиентская система для:
1. **Извлечения сущностей** из кода (Model, Controller, Service, Vue)
2. **Построения графа знаний** с связями между сущностями
3. **Активации нейронов** — детекторы проблем и паттернов
4. **Итеративного сбора контекста** для задач

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│ Клиент (Web UI / CLI)                                           │
│   → Отправляет package.json + composer.json                     │
│   → Получает questions, использует RAG для поиска файлов        │
│   → Отправляет найденные файлы                                  │
├─────────────────────────────────────────────────────────────────┤
│ Сервер (a2a-server)                                             │
│   → Framework Extractor: Vue, Laravel, Tailwind версии          │
│   → Entity Recognizer: Model, Controller, Service, Vue          │
│   → Graph Store: сущности и связи (БЕЗ БД!)                     │
│   → Neuron Activator: ~100 нейронов-детекторов                  │
├─────────────────────────────────────────────────────────────────┤
│ Протокол: JSON REST API                                         │
│   → POST /api/v1/requests                                       │
│   → GET /api/v1/requests/:promiseId/result                      │
└─────────────────────────────────────────────────────────────────┘
```

## Быстрый старт

```bash
# Запуск сервера
npm run dev

# Или без авторизации
cd a2a-server && npm run dev:no-auth
```

**Первый запрос:**
```json
POST /api/v1/requests
{
  "context": {
    "project_path": "C:/workspace/project",
    "new_task": ["Add email verification"]
  },
  "codeBlocks": [
    { "path": "package.json", "content": "..." },
    { "path": "composer.json", "content": "..." }
  ]
}
```

**Ответ:**
```json
{
  "outcome": "graph_incomplete",
  "frameworks": {
    "frontend": ["vue@3.5.0", "inertia@2.2.18"],
    "backend": ["laravel@11.0"]
  },
  "questions": ["Which model stores users?"],
  "graph": { "entities": [], "relations": [] }
}
```

## Документация

| Документ | Назначение |
|----------|------------|
| [AGENTS.md](AGENTS.md) | Что делать сейчас |
| [docs/README.md](docs/README.md) | Индекс всех документов |
| [docs/protocol-json-api.md](docs/protocol-json-api.md) | JSON протокол |
| [docs/architecture-principles.md](docs/architecture-principles.md) | Архитектурные принципы |

## Структура проекта

```
a2a-server/           # Сервер (Node.js, Express, TypeScript)
  src/services/       # Основные сервисы
    entity-recognizer.service.ts    # Распознавание сущностей
    graph-store.service.ts          # Граф знаний (in-memory)
    framework-extractor.service.ts  # Извлечение фреймворков
    neuron-activator.service.ts     # Активация нейронов
    request-processor.service.ts    # Обработка запросов
  src/neurons/        # ~100 нейронов-детекторов

a2a-client/           # Клиент
  packages/api-client/  # API клиент
  packages/rag/         # RAG для поиска по коду
  web/                  # Web UI
```

## Ключевые принципы

1. **Сервер НЕ хранит данные клиента** — граф передаётся в контексте
2. **Сервер НЕ знает какие файлы есть** — клиент использует RAG для поиска
3. **Нейроны активируются по триггерам** — фреймворки, контент, задача
4. **Итерации до завершения** — `graph_incomplete` → `completed`

## Нейроны

~100 нейронов для детекции:
- N+1 queries, missing indexes
- Security issues (SQL injection, XSS, CSRF)
- Missing validation, tests
- Tailwind issues, TypeScript any
- Laravel-specific patterns

## Разработка

```bash
# Установка зависимостей
npm install

# Тесты
npm test

# Линтинг
npm run lint
```

## Лицензия

MIT
