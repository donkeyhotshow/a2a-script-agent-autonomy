# ADR-0030: Unified Agent Mode — от множества режимов к единому Agent

## Статус

**Proposed** (Предложен)

## Контекст

### Текущая архитектура

Система использует множество отдельных режимов (симуляций), каждый из которых определяет свой набор `action` и `step`:

```
LLM_PIPELINE_ACTIONS = [
    'dialog',        → dialog prompt
    'auto-ai',       → auto-ai prompt
    'auto-ai-v2',    → auto-ai prompt (optimized)
    'coder',         → coder prompt
    'coder-smart',  → coder prompt
    'coder-smart-v2' → coder prompt
    'analyze',      → analyze prompt ❌
    'task-decomposition'
]
```

**ACTION_TO_SCHEMA маппинг:**
- `dialog` → `dialog`
- `auto-ai` / `auto-ai-v2` → `auto-ai`
- `coder` / `coder-smart` / `coder-smart-v2` → `coder`
- `analyze` → `analyze`
- `task-decomposition` → `task-decomposition`

### Проблема

1. **Дублирование функциональности**: `analyze` практически идентичен `coder`, просто с другим фокусом (анализ vs редактирование)
2. **Фрагментация**: каждый режим — отдельная симуляция, что создает "разделенную" систему
3. **Рост сложности**: с каждым новым режимом растет количество промптов, трансформов, симуляций
4. **Негибкость**: пользователь не может переключиться между "анализом" и "кодированием" внутри одного сеанса

### Наблюдение пользователя

> "Я хочу начать с того, чтобы утилизировать симуляцию `analyze`, потому что я думаю, агентские режимы надо свести к минимуму. Режим анализ мне не нужен, потому что я и так могу попросить анализ. Но дело в том, что я все равно пытался организовать уникальные данные в промпт в зависимости от `execute.action` и `execute.step`."
>
> "Если эти режимы мы высвечиваем в рамках нескольких симуляций, то кажется что система разделена. Но я считаю, что если под крышей одной симуляции, мы сможем организовать переходы между action и step, то мы сможем делать симуляции не просто на какой-то режим, а режим у нас будет отдельный, допустим, режим агент, а action и step будут меняться либо по алгоритму, либо ИИ будет решать, либо ИИ будет решать в зависимости от входящей задачи."

## Решение

### Концепция: Единый Agent Mode

Вместо множества режимов — **один универсальный `agent` режим**, где:

1. **action** — текущее действие (какой инструмент использовать): `rag-search`, `read-file`, `write-file`, `execute-command`, `dialog`
2. **step** — фаза работы: `plan`, `analyze`, `execute`, `review`, `completed`
3. **Переходы** между action/step определяются:
   - **Алгоритмически**: на основе результата предыдущего действия (например, after `rag-search` → decide next)
   - **LLM решением**: LLM анализирует контекст и решает что делать дальше
   - **В зависимости от задачи**: разные задачи → разные последовательности шагов

### Преимущества

| Аспект | До (множество режимов) | После (единый agent) |
|--------|------------------------|----------------------|
| Количество промптов | 4+ (dialog, auto-ai, coder, analyze...) | 1 (agent) |
| Симуляции | analyze/, coder/, auto-ai-v2/... | agent/ (с вариациями) |
| Гибкость | Пользователь выбирает режим в начале | Agent адаптируется к задаче |
| Переходы между действиями | Жестко заданы внутри режима | Динамические |

### Структура Agent Mode

Один режим — золотой стандарт, с вариациями:

```
simulations/agent/           # Базовый скелет (router → agent)
simulations/agent-analyze/  # Вариант: Analyze flow
simulations/agent-coder/     # Вариант: Coder flow  
simulations/agent-auto-ai-v2/ # Вариант: Auto-AI v2 flow
```

Каждая вариация — полноценная симуляция с шагами.

## Матрица поглощения симуляций

| Симуляция | Поглощение в Agent? | Примечание |
|-----------|---------------------|------------|
| `analyze` | ✅ **Да** | Фокус на `step: analyze` — поиск, чтение, анализ без редактирования |
| `coder` | ✅ **Да** | Фокус на `step: execute` — чтение + запись файлов |
| `auto-ai` | ✅ **Да** | Базовая версия Agent с полным циклом |
| `auto-ai-v2` | ✅ **Да** | Полный цикл с scratchpad, context.files — эталонный сценарий |
| `coder-smart` | ✅ **Да** | Structured flow → Agent с уточнением задачи |
| `coder-smart-v2` | ✅ **Да** | Virtual task doc → Agent с workbench sections |
| `dialog` | ❌ **Нет** | Отдельный режим — простой чат без инструментов |
| `task-decomposition` | ❌ **Нет** | Отдельный режим — специфичная логика декомпозиции задач |
| `fix-vue-imports` | ❌ **Нет** | Scripted — без LLM |
| `fix-laravel-namespaces-and-uses` | ❌ **Нет** | Scripted — без LLM |
| `phpunit-deprecations` | ❌ **Нет** | Scripted — без LLM |
| `orchestrator-dialog` | ❌ **Нет** | Специальный Orchestrator режим |

### Детали поглощения:

**analyze → agent-analyze:**
- User: "проаналізуй архітектуру"
- Agent: `step: analyze` → `rag-search` → `read-file` → `dialog` → `completed`
- Отличие от coder: не делает `write-file` с кодом, только `write-file` отчета

**coder → agent-coder:**
- User: "додай роут /health"
- Agent: `step: analyze` → `execute` → `review` → `completed`
- Включает `write-file` с кодом

**auto-ai-v2 → agent-auto-ai-v2:**
- Full cycle с:
  - `context.scratchpad` (как флаги в workbench)
  - `context.files` (working set)
  - RAG pagination
  - Server interrupt loop

**coder-smart / coder-smart-v2 → agent-coder:**
- Включается в coder flow как расширенная версия

**Prompt (agent-request.md):**
```markdown
## System Prompt

You are Agent. The user gives you a task and you must decide the next action to progress toward that goal.

## Steps (phases)

- `"plan"` — understand task, outline approach
- `"analyze"` — search, read, understand code/docs
- `"execute"` — write code, create files
- `"review"` — verify, test, lint
- `"completed"` — task finished

## Actions (tools)

- `rag-search` — search for relevant code/docs
- `read-file` — read file contents
- `write-file` — create/modify files
- `execute-command` — run commands
- `dialog` — ask user clarifying questions

## Decision Logic

You decide:
1. Which **step** (phase) you're in
2. Which **action** (tool) to use next
3. Whether to continue or complete

The server tracks your progress in context.execution.step.
```

### Пример переходов

```
User: "проаналізуй архітектуру проекту"
  → step: plan
  → action: rag-search (query: "architecture documentation")
  → result: found docs
  → step: analyze
  → action: read-file (path: "ARCHITECTURE.md")
  → result: content
  → step: review
  → action: dialog (message: "Вот анализ...")
  → step: completed
```

vs

```
User: "додай роут /health"
  → step: plan
  → action: rag-search (query: "express routes")
  → step: analyze
  → action: read-file (path: "src/app.ts")
  → step: execute
  → action: write-file (path: "src/routes/health.ts")
  → step: review
  → action: execute-command (npm run dev)
  → step: completed
```

## Последствия

### Положительные

- **Упрощение**: один режим вместо 8+
- **Гибкость**: agent сам решает что делать
- **Единая симуляция**: все сценарии в одном месте
- **Масштабируемость**: легко добавить новые инструменты/шаги

### Отрицательные

- **Сложность LLM промпта**: нужно научить LLM правильно переключаться между шагами
- **Меньше предсказуемость**: режим не гарантирует определенную последовательность
- **Миграция**: нужно перевести существующие симуляции (coder, analyze, auto-ai-v2) на новую структуру

### Риски

- LLM может "застрять" в одном step
- Требуется хороший system prompt с примерами переходов

## Миграционный план

1. **Создать** `agent-request.md` с универсальным промптом
2. **Обновить** `ACTION_TO_SCHEMA`:
   ```typescript
   const ACTION_TO_SCHEMA = {
       // ... существующие маппинги для совместимости
       agent: 'agent',  // НОВЫЙ
   };
   ```
3. **Создать** симуляцию `simulations/agent/` с типичными сценариями
4. **Обновить** роутер (初期 выбор режима): добавить `agent` в список
5. **Утилизировать** (использовать как основу) существующие симуляции:
   - `analyze` → agent сценарий "анализ"
   - `coder` → agent сценарий "кодирование"
   - `auto-ai-v2` → agent сценарий "полный цикл"

## Альтернативы

### 1. Сохранить режимы, но унифицировать промпты

Оставить `coder`, `analyze`, `dialog`, но сделать их вариациями одного промпта с параметрами.

**Плюс**: меньше изменений
**Минус**: все еще фрагментировано

### 2. Убрать только analyze

Оставить `coder` для анализа и кодирования, удалить `analyze` как отдельный режим.

**Плюс**: минимальные изменения
**Минус**: не решает фундаментальную проблему

## Связанные ADR

- [ADR-0026](./ADR-0026-server-llm-request-prep.md) — Server LLM request prep
- [ADR-0029](./ADR-0029-server-interrupt-loop.md) — Server interrupt loop
