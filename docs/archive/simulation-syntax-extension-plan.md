# План расширения синтаксиса симуляций

> **Архів:** перенесено з `a2a-server/docs/simulation-syntax-extension-plan.md` (березень 2026). Статус незмінний — **не виконано**. Актуальний опис підготовки запиту до LLM див. [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md).

> **Статус:** Не выполнен ❌
> - ❌ Нет секции `@neurons` в симуляциях
> - ❌ Нет `@context-pipeline`
> - ❌ Нет `@llm-requirements` в синтаксисе
> - ❌ Нет интеграции neurons в simulation engine

## Цель

Добавить поддержку neurons как плагинов для обогащения контекста и формирования требований LLM.

## Новые секции в симуляциях

### 1. Секция `@neurons`

Определяет какие neurons активировать для данной симуляции.

```markdown
# Simulation: coder-smart

## @neurons
intent-detectors:
  - semantic-intent:
      confidence: 0.8
      max_intents: 3
  - code-generation-detector:
      patterns: ["create", "generate", "implement"]

context-enrichers:
  - framework-detector:
      cache_ttl: 3600
  - pattern-matcher:
      max_patterns: 5
  - import-analyzer:
      depth: 2

action-suggesters:
  - next-step-suggester:
      look_ahead: 3
```

### 2. Секция `@context-pipeline`

Определяет pipeline обработки контекста.

```markdown
## @context-pipeline
stages:
  - name: detect-intent
    neurons:
      - semantic-intent
      - code-generation-detector
    parallel: true
    timeout: 1000

  - name: enrich-context
    neurons:
      - framework-detector
      - pattern-matcher
    depends_on: detect-intent
    parallel: true
    timeout: 2000

  - name: suggest-actions
    neurons:
      - next-step-suggester
    depends_on: enrich-context
    timeout: 500

output:
  format: enriched
  include_neuron_metadata: true
```

### 3. Секция `@llm-requirements`

Шаблон для формирования требований LLM.

```markdown
## @llm-requirements
template: |
  На основе анализа запроса, тебе потребуется:
  {{#each needs}}
  {{index}}. {{this}}
  {{/each}}

generate_from:
  - detected_intents
  - framework_info
  - similar_patterns

rules:
  - if: detected_intents contains "code_generation"
    add: 
      - "Понимание архитектуры проекта"
      - "Примеры похожего кода из проекта"
      
  - if: detected_intents contains "refactoring"
    add:
      - "Анализ зависимостей"
      - "Проверка на breaking changes"
      
  - if: framework_info exists
    add:
      - "Знание паттернов {{framework_info.name}}"
```

### 4. Секция `@response-format`

Расширенный формат ответа с llmNeeds.

```markdown
## @response-format
structure:
  message:
    type: string
    required: true
    
  llmNeeds:
    type: array
    items: string
    max_items: 10
    required: true
    description: "Требования для решения задачи"
    
  action:
    type: object
    required: false
    properties:
      type:
        enum: [read-file, write-file, execute-command, rag-search]
      params:
        type: object

validation:
  - rule: llmNeeds.length > 0
    error: "Должно быть хотя бы одно требование"
    
  - rule: llmNeeds.length <= 10
    error: "Максимум 10 требований"
```

## Расширение request.md шаблона

### Динамическое включение neuron-данных

```markdown
# Request Template

## Context
{{context}}

## Neuron Analysis Results
{{#if neuron_results}}
### Detected Intents
{{#each neuron_results.detected_intents}}
- {{type}} (confidence: {{confidence}})
{{/each}}

### Enriched Data
{{#each neuron_results.enrichments}}
- {{key}}: {{value}}
{{/each}}
{{/if}}

## LLM Requirements
{{#if llmNeeds}}
Для качественного решения задачи тебе потребуется:
{{#each llmNeeds}}
{{@index}}. {{this}}
{{/each}}
{{else}}
Анализируй запрос и определи необходимые требования самостоятельно.
{{/if}}

## Response Format
```json
{
  "message": "...",
  "llmNeeds": ["..."],
  "action": {...}
}
```
```

## Примеры симуляций с новым синтаксисом

### Пример 1: code-generation-smart

```markdown
# Simulation: code-generation-smart

## Description
Умная генерация кода с анализом намерений и контекста.

## @neurons
intent-detectors:
  - semantic-intent:
      confidence: 0.75
  - code-generation-detector

context-enrichers:
  - framework-detector
  - pattern-matcher:
      max_patterns: 3
  - import-analyzer

## @context-pipeline
stages:
  - detect-intent
  - enrich-context

## @llm-requirements
rules:
  - if: intent == "code_generation"
    add:
      - "Понимание архитектуры проекта"
      - "Примеры похожего кода"
      - "Следование стилю проекта"

## @response-format
structure:
  llmNeeds:
    required: true

## Steps
1. analyze
2. generate
3. validate
```

### Пример 2: refactoring-smart

```markdown
# Simulation: refactoring-smart

## Description
Рефакторинг с анализом зависимостей и рисков.

## @neurons
intent-detectors:
  - refactoring-detector
  - scope-analyzer

context-enrichers:
  - dependency-analyzer
  - test-detector:
      find_related_tests: true
  - breaking-change-analyzer

action-suggesters:
  - refactoring-strategy-suggester

## @llm-requirements
rules:
  - if: has_dependencies
    add:
      - "Анализ зависимостей"
      - "Проверка на breaking changes"
  - if: has_tests
    add:
      - "Обновление связанных тестов"
      - "Запуск тестов после рефакторинга"

## Steps
1. analyze-scope
2. detect-dependencies
3. refactor
4. validate
```

### Пример 3: debugging-assistant

```markdown
# Simulation: debugging-assistant

## Description
Помощь в отладке с анализом ошибок и логов.

## @neurons
intent-detectors:
  - debug-intent-detector
  - error-pattern-detector

context-enrichers:
  - log-analyzer
  - stack-trace-parser
  - environment-detector

action-suggesters:
  - debugging-step-suggester

## @llm-requirements
rules:
  - if: has_stacktrace
    add:
      - "Анализ stack trace"
      - "Определение точки сбоя"
  - if: has_logs
    add:
      - "Анализ логов ошибок"
      - "Поиск связанных событий"

## Steps
1. analyze-error
2. collect-logs
3. suggest-fix
4. validate
```

## Реализация

### Phase 1: Базовый парсер (1 неделя)

- [ ] Расширить parser для секций `@neurons`, `@context-pipeline`
- [ ] Добавить валидацию новых секций
- [ ] Создать JSON Schema для нового синтаксиса

### Phase 2: Neuron Runner (2 недели)

- [ ] Создать NeuronOrchestrator
- [ ] Реализовать parallel execution
- [ ] Добавить таймауты и обработку ошибок

### Phase 3: Context Builder (1 неделя)

- [ ] Реализовать pipeline stages
- [ ] Добавить зависимости между stages
- [ ] Создать merger для результатов

### Phase 4: LLM Requirements Generator (1 неделя)

- [ ] Реализовать template engine
- [ ] Добавить правила генерации needs
- [ ] Интегрировать с request.md

### Phase 5: Интеграция (1 неделя)

- [ ] Обновить existing симуляции
- [ ] Добавить тесты
- [ ] Обновить документацию

## Benefits

1. **Декларативность** — neurons определяются в симуляции
2. **Гибкость** — легко добавлять новые neurons
3. **Прозрачность** — видно какой контекст добавляется
4. **Контроль** — явные требования к LLM через llmNeeds
5. **Расширяемость** — новый синтаксис позволяет сложные сценарии
