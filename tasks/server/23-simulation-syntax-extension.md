# Task 23: Simulation Syntax Extension

## Goal
Расширить синтаксис симуляций для поддержки neurons как плагинов обогащения контекста, context pipeline и генерации требований LLM.

## Priority
**P1 (High)**

## Estimated Time
1.5-2 недели

## Background
На основе документа [`docs/simulation-syntax-extension-plan.md`](docs/simulation-syntax-extension-plan.md) требуется добавить новые секции в формат симуляций для декларативного определения neurons и pipeline обработки.

---

## Phase 1: Parser Extension (Days 1-3)

### 1.1 @neurons Section
**Location**: `src/simulation/parser.ts`

**New Syntax**:
```markdown
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

**TypeScript Interface**:
```typescript
interface NeuronsSection {
  intentDetectors: Array<{
    name: string;
    config: Record<string, unknown>;
  }>;
  contextEnrichers: Array<{
    name: string;
    config: Record<string, unknown>;
  }>>;
  actionSuggesters: Array<{
    name: string;
    config: Record<string, unknown>;
  }>;
}
```

**Tasks**:
- [ ] Добавить парсинг секции `@neurons`
- [ ] Поддержка YAML-like синтаксиса внутри секции
- [ ] Валидация neuron names против registry
- [ ] Type-safe config parsing

### 1.2 @context-pipeline Section
**Location**: `src/simulation/parser.ts`

**New Syntax**:
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

**TypeScript Interface**:
```typescript
interface ContextPipelineSection {
  stages: Array<{
    name: string;
    neurons: string[];
    parallel: boolean;
    timeout: number;
    dependsOn?: string[];
  }>;
  output: {
    format: 'enriched' | 'minimal';
    includeNeuronMetadata: boolean;
  };
}
```

**Tasks**:
- [ ] Парсинг stages с зависимостями
- [ ] Валидация DAG (no cycles)
- [ ] Разрешение зависимостей
- [ ] Parallel/sequential execution flags

### 1.3 @llm-requirements Section
**Location**: `src/simulation/parser.ts`

**New Syntax**:
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

**TypeScript Interface**:
```typescript
interface LLMRequirementsSection {
  template: string;  // Handlebars template
  generateFrom: string[];
  rules: Array<{
    condition: string;
    add: string[];
  }>;
}
```

**Tasks**:
- [ ] Template engine integration (Handlebars)
- [ ] Condition parsing (simple DSL)
- [ ] Variable interpolation

---

## Phase 2: Context Pipeline Implementation (Days 4-7)

### 2.1 Pipeline Runner
**File**: `src/simulation/context-pipeline.ts`

```typescript
interface PipelineRunner {
  run(pipeline: ContextPipelineSection, context: DialogContext): Promise<PipelineResult>;
}

interface PipelineResult {
  stages: Array<{
    name: string;
    status: 'success' | 'error' | 'timeout';
    results: NeuronResult[];
    executionTime: number;
  }>;
  finalContext: EnrichedContext;
}

class ContextPipelineRunner implements PipelineRunner {
  constructor(
    private orchestrator: NeuronOrchestrator,
    private registry: NeuronRegistry
  );
  
  async run(pipeline, context): Promise<PipelineResult> {
    // 1. Topological sort of stages by dependencies
    // 2. Execute stages in order
    // 3. Handle parallel/sequential execution
    // 4. Merge results between stages
  }
}
```

**Requirements**:
- [ ] Topological sort для stages
- [ ] Parallel execution внутри stage
- [ ] Sequential execution между stages
- [ ] Timeout handling per stage
- [ ] Error propagation

### 2.2 Stage Dependencies
```typescript
function resolveStageDependencies(stages: PipelineStage[]): PipelineStage[] {
  // 1. Build dependency graph
  // 2. Detect cycles
  // 3. Return topologically sorted stages
}
```

**Requirements**:
- [ ] DAG validation
- [ ] Cycle detection с понятными ошибками
- [ ] Parallel execution для independent stages

---

## Phase 3: LLM Requirements Generator (Days 8-10)

### 3.1 Template Engine
**File**: `src/simulation/llm-requirements-generator.ts`

```typescript
class LLMRequirementsGenerator {
  constructor(private templateEngine: Handlebars);
  
  generate(
    config: LLMRequirementsSection,
    neuronResults: NeuronResult[]
  ): string[] {
    // 1. Extract data from neuron results
    // 2. Apply conditional rules
    // 3. Render template
    // 4. Return llmNeeds array
  }
  
  private evaluateCondition(condition: string, data: unknown): boolean {
    // Simple DSL: "detected_intents contains 'code_generation'"
    //            "framework_info exists"
  }
}
```

**Requirements**:
- [ ] Handlebars integration
- [ ] Simple condition DSL
- [ ] Array aggregation (unique needs, max 10)
- [ ] Priority ordering

### 3.2 Request.md Integration

**Template Update**:
```markdown
# Request

## User Message
{{userMessage}}

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
```

---

## Phase 4: Validation & Schema (Days 11-12)

### 4.1 JSON Schema
**File**: `src/simulation/schemas/simulation-v2.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "neurons": {
      "type": "object",
      "properties": {
        "intentDetectors": { "type": "array" },
        "contextEnrichers": { "type": "array" },
        "actionSuggesters": { "type": "array" }
      }
    },
    "contextPipeline": {
      "type": "object",
      "properties": {
        "stages": { "type": "array" },
        "output": { "type": "object" }
      }
    },
    "llmRequirements": {
      "type": "object",
      "properties": {
        "template": { "type": "string" },
        "generateFrom": { "type": "array" },
        "rules": { "type": "array" }
      }
    }
  }
}
```

### 4.2 Validation
- [ ] Schema validation для всех новых секций
- [ ] Neuron name validation против registry
- [ ] Stage dependency validation
- [ ] Template syntax validation

---

## Files to Modify/Create

```
src/simulation/
├── parser.ts                           # ADD: New section parsing
├── context-pipeline.ts                 # CREATE: Pipeline runner
├── llm-requirements-generator.ts       # CREATE: Requirements generator
├── schemas/
│   └── simulation-v2.schema.json       # CREATE: JSON Schema
└── validators/
    └── pipeline-validator.ts           # CREATE: DAG validation

tests/simulation/
├── parser-new-sections.test.ts
├── context-pipeline.test.ts
└── llm-requirements.test.ts
```

---

## Example Simulation

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

## @context-pipeline
stages:
  - name: intent-detection
    neurons:
      - semantic-intent
      - code-generation-detector
    parallel: true
    timeout: 1000

  - name: context-enrichment
    neurons:
      - framework-detector
      - pattern-matcher
    depends_on: intent-detection
    parallel: true
    timeout: 2000

## @llm-requirements
rules:
  - if: intent == "code_generation"
    add:
      - "Понимание архитектуры проекта"
      - "Примеры похожего кода"
      - "Следование стилю проекта"

## Steps
1. analyze
2. generate
3. validate
```

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Task 22 (Neurons v2 Implementation)
- **Related**: [`docs/simulation-syntax-extension-plan.md`](docs/simulation-syntax-extension-plan.md)

---

## Acceptance Criteria

- [ ] Parser поддерживает секции `@neurons`, `@context-pipeline`, `@llm-requirements`
- [ ] Context Pipeline реализован с stages и dependencies
- [ ] LLM Requirements Generator работает с templates и rules
- [ ] JSON Schema обновлена для нового синтаксиса
- [ ] Валидация работает для всех новых секций
- [ ] Существующие симуляции продолжают работать (backward compatibility)
- [ ] Документация обновлена с примерами
