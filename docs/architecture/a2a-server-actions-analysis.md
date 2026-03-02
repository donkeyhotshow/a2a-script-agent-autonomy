# Анализ архитектуры A2A-Server

## Содержание

1. [Actions vs AI-Actions](#1-actions-vs-ai-actions)
2. [Интеграция с External AI Hub](#2-интеграция-с-external-ai-hub)
3. [Симуляции и маппинг](#3-симуляции-и-маппинг)

---

## 1. Actions vs AI-Actions

### 1.1 Обзор концепции

Система действий A2A разделяет все операции на два типа:

| Тип | Описание | Контроль |
|-----|----------|----------|
| **Actions** | Сервер-driven, жестко заданные шаги | Сервер контролирует поток выполнения |
| **AI-Actions** | Динамические шаги, где LLM выбирает следующее действие | LLM решает поток выполнения |

### 1.2 Структура Action Definitions

#### MD-формат (legacy)

Располагается в [`a2a-server/src/actions/definitions/*.md`](a2a-server/src/actions/definitions/)

Структура:
```markdown
# action-id

**Планы:** [ссылки на планы]

## Sub-actions (N steps)

### 1. step-id

**Input:** описание
**Output:** описание

```typescript
// TypeScript код для выполнения
export default async function run(input: {...}) {
  return { output_key: value };
}
```

## Context
- Framework: название
- Build tool: инструмент
```

**Пример:** [`fix-vue-imports.md`](a2a-server/src/actions/definitions/fix-vue-imports.md)
- 4 жестко заданных шага: `vue-import-detect` → `vue-import-resolve` → `vue-import-apply` → `vue-import-cleanup`
- Каждый шаг содержит TypeScript код в блоке

#### AI-Action формат

**Пример:** [`ai-session-context.md`](a2a-server/src/actions/definitions/ai-session-context.md)

Дополнительные секции:
```markdown
## Priority
90

## Context
```json
{
  "type": "session_context",
  "creates_files": true,
  "llm_guided": true,
  "iterations": "multiple"
}
```

## Triggers
- "сохрани контекст"
- "запомни"
- "new session"
```

### 1.3 YAML DSL формат (canonical)

Располагается в [`a2a-server/src/actions/definitions/yaml/actions/*.yaml`](a2a-server/src/actions/definitions/yaml/actions/)

Структура:
```yaml
id: action-id
version: 1.0
title: "Название"
description: "Описание"

# Подключение миксинов
mixins:
  - file-collector
  - code-analyzer
  - patch-applier

# Контекст выполнения
context:
  framework: vue
  build-tool: vite

# Триггеры для семантического поиска
triggers:
  - fix vue imports
  - resolve import issues
  - исправить импорты

# Пайплайн шагов
steps:
  - id: collect
    description: "Collect Vue and TypeScript files"
    $mixin: file-collector
    input:
      rootDir: "${context.rootDir}"
      extensions:
        - .vue
        - .ts
    output: files

  - id: analyze
    description: "Find import statements"
    script: |
      // TypeScript код inline
      export default async function run(input) {
        return { broken_imports: [...] };
      }
    input:
      files: "{{ collect.files }}"
    output: import_matches
```

### 1.4 DSL Архитектура

Компоненты DSL находятся в [`a2a-server/src/actions/dsl/`](a2a-server/src/actions/dsl/):

| Компонент | Файл | Назначение |
|-----------|------|------------|
| Parser | [`parser.ts`](a2a-server/src/actions/dsl/parser.ts) | Парсинг YAML в AST |
| Validator | [`validator.ts`](a2a-server/src/actions/dsl/validator.ts) | Валидация структуры |
| Resolver | [`resolver.ts`](a2a-server/src/actions/dsl/resolver.ts) | Разрешение миксинов и интерполяция |
| Index | [`index.ts`](a2a-server/src/actions/dsl/index.ts) | Facade для DSL |

#### Валидация

Проверяет:
- Обязательные поля (`id`, `steps`)
- Формат ID (kebab-case)
- Уникальность step IDs
- Наличие `$mixin` или `script` в каждом шаге
- Ссылки на outputs других шагов

#### Разрешение миксинов

```typescript
// Пример использования миксина
steps:
  - id: collect
    $mixin: file-collector  // <-- Подключает скрипт из mixins/file-collector.yaml
    input:
      rootDir: "{{ context.rootDir }}"
```

Миксины находятся в [`definitions/yaml/mixins/*.yaml`](a2a-server/src/actions/definitions/yaml/mixins/):
- `file-collector.yaml` - сбор файлов
- `code-analyzer.yaml` - анализ кода
- `patch-applier.yaml` - применение патчей

### 1.5 Action Registry

Центральный компонент: [`action-registry.ts`](a2a-server/src/actions/action-registry.ts)

```typescript
export class ActionRegistry {
  private actions: Map<string, ActionDefinition> = new Map();
  
  // Загрузка с приоритетом: YAML > MD
  async loadFromDirectory(dirPath?: string): Promise<void>
  
  // Поиск по семантической близости
  findByKeywords(query: string): ActionMatch[]
}
```

Приоритет загрузки:
1. YAML definitions (приоритет выше)
2. MD definitions (legacy fallback)

### 1.6 Сравнение Actions vs AI-Actions

| Характеристика | Actions | AI-Actions |
|----------------|---------|------------|
| **Шаги** | Жестко заданы | Список доступных, LLM выбирает |
| **Кто определяет next step** | Сервер | LLM из ответа |
| **Отдельные запросы** | Нет (один поток) | Возможны |
| **Использует LLM** | Нет | Да |
| **Execute формат** | `execute.script`, `execute["read-file"]` | `execute.form`, `execute.message`, произвольные |
| **Примеры** | fix-vue-imports, phpunit-deprecations | dialog, coder, coder-smart, auto-ai |

---

## 2. Интеграция с External AI Hub

### 2.1 Архитектура интеграции

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   A2A-Server │────▶│ LLM Adapter  │────▶│  External AI    │
│              │     │              │     │    Hub          │
│              │◀────│              │◀────│  (Ollama)       │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                                          │
       │     ┌──────────────┐                    │
       └────▶│  Promise ID  │◀───────────────────┘
            │  (async flow) │
            └──────────────┘
```

### 2.2 LLM Adapter

Файл: [`services/llm-adapter.ts`](a2a-server/src/services/llm-adapter.ts)

```typescript
export interface LLMInput {
  context: Record<string, unknown>;
  injectedContent: string;
  requestFiles?: string[];
}

export async function callLLM(input: LLMInput): Promise<string>
```

Поддерживаемые провайдеры:
| Провайдер | Переменная окружения | Endpoint |
|-----------|---------------------|----------|
| Ollama | `LLM_PROVIDER=ollama` или `USE_OLLAMA=1` | `AI_HUB_URL/api/generate` |
| OpenAI | `LLM_PROVIDER=openai` | `api.openai.com/v1/chat/completions` |
| Placeholder | fallback | - |

### 2.3 Ollama Promise-Based Flow

Файл: [`services/ollama-adapter.ts`](a2a-server/src/services/ollama-adapter.ts)

```typescript
// Создание промиса (неблокирующий)
export async function createOllamaPromise(request: OllamaRequest): 
  Promise<{ promiseId: string }>

// Проверка статуса
export async function getPromiseStatus(promiseId: string): 
  Promise<{ status: 'pending' | 'done' | 'error', error?: string }>

// Получение результата
export async function getPromiseResponse(promiseId: string): 
  Promise<Response>

// Ожидание с polling
export async function waitForPromise(
  promiseId: string, 
  onProgress?: (status) => void
): Promise<string>
```

Параметры polling:
- `POLL_INTERVAL_MS` - интервал опроса (default: 2000ms)
- `POLL_TIMEOUT_MS` - таймаут ожидания (default: 120000ms)

### 2.4 External AI Trigger Neuron

Файл: [`neurons/external-ai-trigger.neuron.ts`](a2a-server/src/neurons/external-ai-trigger.neuron.ts)

```typescript
export const externalAiTriggerNeuron: Neuron = {
  id: 'neuron-external-ai-trigger',
  category: 'external_ai',
  triggers: ['completed', 'ready-for-ai', 'iteration-complete'],
  priority: 1, // lowest - runs last
  actions: [{ type: 'trigger', target: 'external-ai' }],
};
```

Активируется на последнем этапе итерации для передачи задачи внешнему AI.

### 2.5 Protocol: Context Parser

Файл: [`protocol/context-parser.ts`](a2a-server/src/protocol/context-parser.ts)

Формирует [`request.md`](simulations/auto-ai/3/request.md) для LLM:

```markdown
# A2A Protocol Request

## Context
```json
{
  "version": "1.0",
  "session_id": "...",
  "tasks": [...],
  "history": [...]
}
```

## Current State
...

## Available Actions
...
```

### 2.6 Protocol: Message Builder

Файл: [`protocol/message-builder.ts`](a2a-server/src/protocol/message-builder.ts)

Обрабатывает [`response.md`](simulations/auto-ai/3/response.md) от LLM:

```json
{
  "message": "Ответ от LLM",
  "action": "read-file",
  "params": { "path": "src/main.ts" }
}
```

Преобразует в [`response.json`](simulations/auto-ai/3/response.json):

```json
{
  "context": { ... },
  "execute": {
    "read-file": { "path": "src/main.ts" }
  }
}
```

### 2.7 Async Flow с PromiseId

```
1. Client → Server: request.json
2. Server → AI Hub: POST /api/generate?promise=1
3. AI Hub → Server: { promiseId }
4. Server → Client: { status: 'pending', promiseId }
5. [Polling] Server → AI Hub: GET /promise/{id}
6. AI Hub → Server: { status: 'done' }
7. Server → AI Hub: GET /promise/{id}/response
8. Server → Client: final response.json
```

---

## 3. Симуляции и маппинг

### 3.1 Структура симуляций

Директория: [`simulations/`](simulations/)

```
simulations/
├── SCHEMA.md              # Каноническая схема
├── REFERENCE.md           # Справочник Actions vs AI-Actions
├── fix-vue-imports/       # Actions пример
│   ├── description.md
│   ├── analysis.md
│   └── 1/, 2/, 3/, 4/, 5/ # Шаги
├── auto-ai/              # AI-Actions пример
│   ├── ACTIONS-MAP.md
│   └── 1/, 2/, ... 16/
└── ...
```

### 3.2 Pipeline симуляции (6 файлов)

| Файл | Направление | Описание |
|------|-------------|----------|
| `request.json` | Client → Server | Payload от клиента |
| `server-transforms-request.json` | — | Как сервер обрабатывает request |
| `request.md` | Server → LLM | Markdown для LLM |
| `response.md` | LLM → Server | Ответ от LLM |
| `server-transforms-response.json` | — | Как сервер обрабатывает response |
| `response.json` | Server → Client | Финальный payload |

**Порядок:** `request.json` → `server-transforms-request.json` → `request.md` → `response.md` → `server-transforms-response.json` → `response.json`

### 3.3 Action-Key Shape (Critical)

Канонический формат для `execute` и `result`:

**Правильно:**
```json
// Execute с action-type ключом
{ "execute": { "read-file": { "path": "..." } } }

// Result с action-type ключом
{ "result": { "read-file": { "path": "...", "content": "..." } } }
```

**Неправильно:**
```json
// Плоская структура
{ "result": { "content": "..." } }

// Generic action поле
{ "execute": { "action": "read-file", "file": "..." } }
```

### 3.4 Маппинг симуляций на actions

| Симуляция | Тип | Actions | Описание |
|-----------|-----|---------|----------|
| `fix-vue-imports` | Actions | script, rag-search, write-file | Жесткие шаги для исправления импортов |
| `fix-vue-imports-batched` | Actions | script (batched) | Пакетная обработка |
| `auto-ai` | AI-Actions | form, rag-search, read-file, write-file, execute-command | Полный AI-driven flow |
| `coder` | AI-Actions | form, message | Диалог с LLM |
| `coder-smart` | AI-Actions | form, rag-search, write-file | Смарт-кодер с RAG |
| `dialog` | AI-Actions | form, message | AI-диалог |
| `task-decomposition` | AI-Actions | form, message | Декомпозиция задач |

### 3.5 Скрипты работы с симуляциями

Директория: [`a2a-server/scripts/`](a2a-server/scripts/)

| Скрипт | Назначение |
|--------|------------|
| `sim-run.ts` | Запуск одной или всех симуляций |
| `sim-create.ts` | Создание новой симуляции |
| `sim-validate.ts` | Валидация структуры симуляции |
| `sim-compare.ts` | Сравнение с эталоном |
| `sim-report.ts` | Генерация отчетов |

### 3.6 Actions Map

Из [`simulations/auto-ai/ACTIONS-MAP.md`](simulations/auto-ai/ACTIONS-MAP.md):

| Action | Execute | Result | Статус |
|--------|---------|--------|--------|
| `form` | `input: [...]` или `choices` | `choice`, `message`, `path` | ✅ Implemented |
| `rag-search` | `query` | `results[], files[]` | ✅ Implemented |
| `read-file` | `path` | `path, content` | ✅ Implemented |
| `write-file` | `path, content` | `path, success` | ✅ Implemented |
| `execute-command` | `command` | `command, exitCode, stdout, stderr` | ✅ Implemented |
| `script` | `input, output, code` | step result | ✅ fix-vue-imports |

Planned:
- `list-directory`, `grep-search`, `file-exists`, `scan-directory`, `edit-patch`, `run-script`

---

## 4. Интеграционные точки

### 4.1 Между компонентами

```
┌─────────────────────────────────────────────────────────────┐
│                      A2A-Server                              │
├─────────────────────────────────────────────────────────────┤
│  Action Layer                                               │
│  ├── action-registry.ts (загрузка MD/YAML)                 │
│  ├── action-parser.ts (парсинг MD)                         │
│  └── dsl/* (YAML DSL)                                       │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  ├── action-service.ts (оркестрация)                       │
│  ├── llm-adapter.ts (внешний AI)                         │
│  └── request-processor.service.ts (обработка запросов)     │
├─────────────────────────────────────────────────────────────┤
│  Protocol Layer                                             │
│  ├── context-parser.ts (формирование request.md)          │
│  └── message-builder.ts (обработка response.md)           │
├─────────────────────────────────────────────────────────────┤
│  Neuron Layer                                               │
│  └── external-ai-trigger.neuron.ts (триггер AI)          │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐            ┌─────────────────┐
│  Client API     │            │  External AI    │
│  (3001)         │            │  Hub (Ollama)   │
└─────────────────┘            └─────────────────┘
```

### 4.2 Поток данных

1. **Client Request** → `request.json`
2. **Server Transform** → `server-transforms-request.json`
3. **LLM Prompt** → `request.md`
4. **LLM Response** → `response.md`
5. **Server Transform** → `server-transforms-response.json`
6. **Client Response** → `response.json`

---

## 5. Заключение

Архитектура A2A-Server построена на принципе разделения:

- **Actions** для предсказуемых, алгоритмических операций
- **AI-Actions** для адаптивных, требующих анализа задач

DSL система на YAML обеспечивает:
- Композицию через миксины
- Валидацию на этапе загрузки
- Разделение описания и реализации

Интеграция с External AI Hub использует promise-based асинхронный flow, позволяющий не блокировать сервер во время обработки LLM.

Симуляции служат:
- Документацией протокола
- Golden tests для CI/CD
- Тестовыми данными для разработки
