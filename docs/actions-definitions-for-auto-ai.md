# План: Создание Action Definitions для Auto-AI Use Cases

> **Относится к:** a2a-server (actions)

## Связи

| Куда | Что |
|------|-----|
| [a2a-server/src/actions/definitions/README.md](a2a-server/src/actions/definitions/README.md) | Оглавление definitions, ссылки на планы и код |
| [definitions/](a2a-server/src/actions/definitions/) | Все MD: context/, analysis/, graph/, generation/, hybrid/, fallback/, fix-vue-imports*.md |
| [auto-ai-index.ts](a2a-server/src/actions/definitions/auto-ai-index.ts) | Индекс категорий → action IDs |
| [action-registry.ts](a2a-server/src/actions/action-registry.ts) | Загрузка MD из definitions |
| [action-parser.ts](a2a-server/src/actions/action-parser.ts) | Парсинг MD в структуру |
| [actions/index.ts](a2a-server/src/actions/index.ts) | Экспорт registry + Auto-AI хелперы |

## Обзор

Этот план описывает создание Action definitions в [`a2a-server/src/actions/definitions/`](a2a-server/src/actions/definitions/) для каждого use-case из [`a2a-server/docs/use-cases/auto-ai/`](a2a-server/docs/use-cases/auto-ai/).

**Note**: Это **fallback** система - если конкретный action не найден в registry, система использует эти generic actions для обработки задачи через AI.

---

## Существующий пример

Уже есть [`fix-vue-imports.md`](a2a-server/src/actions/definitions/fix-vue-imports.md) - пример action с 4 sub-actions:
1. `vue-import-detect` - обнаружение
2. `vue-import-resolve` - разрешение путей
3. `vue-import-apply` - применение
4. `vue-import-cleanup` - очистка

---

## План Action Definitions по Use Cases

### 1. Context Collection (Сбор контекста)

**Use Case**: [`1-context-collection.md`](a2a-server/docs/use-cases/auto-ai/1-context-collection.md)

**Описание**: Сбор контекста для внешнего AI (Claude, GPT). Сервер ищет и подготавливает релевантный контекст из кодовой базы.

**Actions для создания**:

| Action ID | Название | Описание |
|-----------|---------|----------|
| `context-scan` | Сканирование проекта | Определение структуры, технологий, зависимостей |
| `context-index` | Индексация кода | Создание векторных индексов для семантического поиска |
| `context-query` | Семантический поиск | Поиск релевантных фрагментов по запросу |
| `context-rank` | Ранжирование результатов | Сортировка по релевантности |
| `context-format` | Форматирование контекста | Упаковка контекста для AI |

**Triggers**:
- "собери контекст"
- "найди релевантные файлы"
- "подготовь контекст для анализа"
- "context for"

---

### 2. Code Analysis (Анализ кода)

**Use Case**: [`2-code-analysis.md`](a2a-server/docs/use-cases/auto-ai/2-code-analysis.md)

**Описание**: Сервер анализирует кодовую базу, выявляет проблемы через нейроны (детекторы паттернов).

**Actions для создания**:

| Action ID | Название | Описание |
|-----------|---------|----------|
| `analyze-full` | Полный анализ проекта | Запуск всех активных нейронов |
| `analyze-performance` | Анализ производительности | N+1 queries, missing indexes, memory leaks |
| `analyze-security` | Анализ безопасности | SQL injection, XSS, CSRF, secrets |
| `analyze` | Анализ архитектуры | God objects, duplicated code |
| `analyze-typescript` | Анализ TypeScript | Any types, missing props |
| `analyze-laravel` | Анализ Laravel | Missing validation, eager loading |
| `analyze-vue` | Анализ Vue | Prop drilling, Options API, a11y |
| `analyze-test` | Анализ тестов | Missing tests, coverage |

**Sub-actions для analyze-full**:
1. `analyze-collect` - Сбор файлов для анализа
2. `analyze-detect` - Запуск детекторов
3. `analyze-aggregate` - Агрегация результатов
4. `analyze-prioritize` - Приоритизация по критичности
5. `analyze-report` - Формирование отчёта

**Triggers**:
- "проанализируй проект"
- "найди проблемы"
- "check for issues"
- "analyze security"

---

### 3. Knowledge Graph (Граф знаний)

**Use Case**: [`3-knowledge-graph.md`](a2a-server/docs/use-cases/auto-ai/3-knowledge-graph.md)

**Описание**: Извлечение сущностей из кода и построение связей между ними.

**Actions для создания**:

| Action ID | Название | Описание |
|-----------|---------|----------|
| `graph-build` | Построение графа | Извлечение сущностей и связей |
| `graph-extract-entities` | Извлечение сущностей | Классы, функции, модели, контроллеры |
| `graph-extract-relations` | Извлечение связей | Imports, extends, uses, calls |
| `graph-query` | Запрос к графу | Поиск связей и зависимостей |
| `graph-impact` | Анализ влияния | Что изменится при модификации узла |
| `graph-visualize` | Визуализация | Экспорт в GraphViz |

**Sub-actions для graph-build**:
1. `graph-parse` - Парсинг кода (PHP/JS/TS/Vue)
2. `graph-entities` - Извлечение сущностей
3. `graph-relations` - Построение связей
4. `graph-store` - Сохранение в БД

**Triggers**:
- "построй граф"
- "покажи связи"
- "build knowledge graph"
- "найди зависимости"

---

### 4. Code Generation (Генерация кода)

**Use Case**: [`4-code-generation.md`](a2a-server/docs/use-cases/auto-ai/4-code-generation.md)

**Описание**: Генерация кода на основе задачи пользователя через LLM.

**Actions для создания**:

| Action ID | Название | Описание |
|-----------|---------|----------|
| `generate-crud` | Генерация CRUD | Создание модели, контроллера, миграции |
| `generate-model` | Генерация модели | Model + relationships |
| `generate-controller` | Генерация контроллера | REST endpoints |
| `generate-method` | Генерация метода | Добавление метода в класс |
| `generate-migration` | Генерация миграции | Database schema changes |
| `generate-view` | Генерация представления | Blade/Vue компонент |
| `generate-test` | Генерация тестов | Unit/Feature тесты |

**Sub-actions для generate-crud**:
1. `generate-analyze` - Анализ задачи
2. `generate-context` - Сбор контекста
3. `generate-llm` - Вызов LLM для генерации
4. `generate-validate` - Валидация синтаксиса
5. `generate-diff` - Формирование diff
6. `generate-apply` - Применение изменений (опционально)

**Triggers**:
- "создай контроллер"
- "добавь метод"
- "generate controller"
- "сгенерируй модель"

---

### 5. Hybrid (Гибридный подход)

**Use Case**: [`5-hybrid.md`](a2a-server/docs/use-cases/auto-ai/5-hybrid.md)

**Описание**: Комбинированный подход - сервер собирает контекст, AI анализирует, сервер применяет с валидацией.

**Actions для создания**:

| Action ID | Название | Описание |
|-----------|---------|----------|
| `hybrid-fix` | Исправление проблем | Analyze → AI → Validate → Apply |
| `hybrid-refactor` | Рефакторинг | AI предложения + валидация |
| `hybrid-improve` | Улучшение кода | AI анализ + лучшие практики |
| `hybrid-explain` | Объяснение кода | AI объяснение с контекстом |

**Sub-actions для hybrid-fix**:
1. `hybrid-collect` - Сбор контекста (RAG + Graph)
2. `hybrid-prompt` - Формирование промпта
3. `hybrid-analyze` - Вызов AI
4. `hybrid-parse` - Парсинг ответа AI
5. `hybrid-validate` - Валидация изменений
6. `hybrid-preview` - Превью для пользователя
7. `hybrid-apply` - Применение (с подтверждением)
8. `hybrid-rollback` - Откат при ошибках

**Triggers**:
- "исправь n+1"
- "почини ошибку"
- "fix n+1"
- "улучши код"

---

## Generic Fallback Actions

Для задач которые не подходят под конкретные actions:

| Action ID | Название | Описание |
|-----------|---------|----------|
| `ai-fallback` | AI обработка | Generic LLM вызов для любой задачи |
| `ai-analyze` | AI анализ | Анализ кода через AI |
| `ai-generate` | AI генерация | Генерация кода через AI |

**Triggers для ai-fallback**:
- Любой текст который не matched другими triggers

---

## Примеры MD файлов

### Пример: context-query.md

```markdown
# context-query

Семантический поиск релевантных файлов по запросу.

## Priority
80

## Context
```json
{
  "type": "search",
  "requires_embedding": true,
  "rag_enabled": true
}
```

## Triggers
- найди файлы
- семантический поиск
- search files

## SubActions

### 1. query-parse
**Title:** Парсинг запроса
**Input:** none
**Output:** parsed_query

```typescript
export default async function run(input: { query: string }) {
  // Извлечение ключевых слов
  const keywords = input.query.toLowerCase().split(/\s+/);
  return { parsed_query: { original: input.query, keywords } };
}
```

### 2. query-search
**Title:** Поиск в индексе
**Input:** parsed_query
**Output:** search_results

```typescript
export default async function run(input: { parsed_query: { keywords: string[] } }) {
  // Семантический поиск через RAG
  const results = await semanticSearch(input.parsed_query.keywords);
  return { search_results: results };
}
```

### 3. query-rank
**Title:** Ранжирование результатов
**Input:** search_results
**Output:** ranked_results

```typescript
export default async function run(input: { search_results: any[] }) {
  // Ранжирование по релевантности
  const ranked = input.search_results.sort((a, b) => b.score - a.score);
  return { ranked_results: ranked.slice(0, 10) };
}
```
```

---

## Пример: analyze-performance.md

```markdown
# analyze-performance

Анализ производительности кода.

## Priority
70

## Context
```json
{
  "category": "performance",
  "severity": "warning"
}
```

## Triggers
- анализ производительности
- n+1
- performance check

## SubActions

### 1. perf-collect
**Title:** Сбор файлов для анализа
**Input:** none
**Output:** files[]

```typescript
export default async function run(input: { rootDir: string }) {
  const files = collectFiles(input.rootDir, ['.php', '.js', '.ts']);
  return { files };
}
```

### 2. perf-detect-n1
**Title:** Обнаружение N+1 запросов
**Input:** files[]
**Output:** n1_findings[]

```typescript
export default async function run(input: { files: string[] }) {
  const findings = [];
  // Паттерны N+1 в Laravel/Eloquent
  const patterns = [
    /foreach\s*\([^)]+\)\s*\{[^}]*->\w+\(/g,
  ];
  // ... detection logic
  return { n1_findings: findings };
}
```

### 3. perf-detect-missing-indexes
**Title:** Обнаружение отсутствующих индексов
**Input:** files[]
**Output:** index_findings[]
```

---

## Файлы для создания

### Actions/definitions/ (реализовано + fallback, hybrid-improve, hybrid-explain):

Реализованные MD лежат в [`a2a-server/src/actions/definitions/`](a2a-server/src/actions/definitions/):

```
definitions/
├── context/     → context-scan.md, context-index.md, context-query.md, context-rank.md, context-format.md
├── analysis/    → analyze-full.md, analyze-performance.md, analyze-security.md, analyze.md, analyze-test.md
├── graph/       → graph-build.md, graph-query.md, graph-impact.md
├── generation/  → generate-crud.md, generate-model.md, generate-controller.md
├── hybrid/      → hybrid-fix.md, hybrid-refactor.md, hybrid-improve.md, hybrid-explain.md
├── fallback/    → ai-fallback.md, ai-analyze.md, ai-generate.md
├── fix-vue-imports.md, fix-vue-imports-batch.md, fix-vue-imports-alternatives.md, fix-vue-imports-improvements.md
├── README.md    → оглавление и ссылки на планы/код
└── auto-ai-index.ts
```

---

---

## План реализации

### Приоритеты реализации

1. **Высокий** - context-query, analyze-full (основные функции)
2. **Высокий** - hybrid-fix (основной use case)
3. **Средний** - graph-build
4. **Средний** - generation (CRUD, model, controller)
5. **Низкий** - specialized анализы (security, performance)

### Следующие шаги

- [x] Реализовать context-query action
- [x] Реализовать analyze-full action
- [x] Реализовать hybrid-fix action
- [x] Реализовать graph-build action
- [x] Реализовать generation actions (CRUD, model, controller)
- [ ] Добавить тесты для каждого action
- [ ] Документировать все action definitions

---

## Зависимости от других компонентов

| Action | Зависимость |
|--------|------------|
| context-* | RAG, Embedding |
| analyze-* | Neurons system |
| graph-* | Knowledge Graph |
| generate-* | LLM (Ollama/AI Hub) |
| hybrid-* | Все вместе |

---

## Тестирование

```bash
# Тест поиска action по триггеру
curl -X POST http://localhost:3000/api/v1/requests \
  -d '{"context": {"new_task": "проанализируй проект"}}'

# Ожидаем: находим analyze-full action
```

---

## Дата

2026-02-24

## Статус

Черновик для обсуждения
