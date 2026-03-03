# Task 22: Neurons Architecture v2 Implementation

## Goal
Реализовать новую архитектуру neurons — систему плагинов-детекторов намерений, работающих параллельно в процессе диалога для обогащения контекста LLM.

## Priority
**P1 (High)**

## Estimated Time
2-3 недели

## Background
На основе документа [`docs/neurons-architecture-v2.md`](docs/neurons-architecture-v2.md) требуется создать новую модульную систему neurons, заменяющую текущую систему в [`a2a-server/src/neurons/`](a2a-server/src/neurons/).

---

## Phase 1: Core Infrastructure (Week 1)

### 1.1 NeuronRegistry
**File**: `src/neurons-v2/neuron-registry.ts`

**Interface**:
```typescript
interface NeuronPlugin {
  name: string;
  version: string;
  type: 'intent_detector' | 'context_enricher' | 'action_suggester';
  shouldActivate(context: DialogContext): boolean;
  process(context: DialogContext): Promise<NeuronResult>;
  onActivate?(): void;
  onDeactivate?(): void;
}

interface NeuronResult {
  intents?: DetectedIntent[];
  enrichments?: EnrichmentData[];
  suggestedActions?: SuggestedAction[];
  needs?: string[];  // LLM requirements
  metadata?: Record<string, unknown>;
}

class NeuronRegistry {
  private plugins: Map<string, NeuronPlugin> = new Map();
  
  register(plugin: NeuronPlugin): void;
  unregister(name: string): void;
  getActivePlugins(context: DialogContext): NeuronPlugin[];
  getAll(): NeuronPlugin[];
  getByType(type: NeuronType): NeuronPlugin[];
}
```

**Requirements**:
- [ ] Type-safe регистрация плагинов
- [ ] Валидация уникальности имен
- [ ] Поддержка версионирования
- [ ] Lazy loading для плагинов

### 1.2 NeuronOrchestrator
**File**: `src/neurons-v2/neuron-orchestrator.ts`

**Interface**:
```typescript
interface OrchestratorConfig {
  timeout: number;           // Default: 5000ms
  parallel: boolean;         // Default: true
  maxConcurrent: number;     // Default: 10
  errorHandling: 'continue' | 'stop' | 'ignore';  // Default: 'continue'
}

interface ExecutionResult {
  plugin: string;
  success: boolean;
  result?: NeuronResult;
  error?: string;
  latency: number;
}

class NeuronOrchestrator {
  constructor(
    private registry: NeuronRegistry,
    private config: OrchestratorConfig
  );
  
  async processDialog(
    userRequest: string,
    currentContext: DialogContext
  ): Promise<EnrichedContext>;
  
  private executeParallel(
    plugins: NeuronPlugin[],
    context: DialogContext
  ): Promise<ExecutionResult[]>;
  
  private mergeResults(
    context: DialogContext,
    results: ExecutionResult[]
  ): EnrichedContext;
  
  private generateLLMNeeds(results: ExecutionResult[]): string[];
}
```

**Requirements**:
- [ ] Parallel execution с `Promise.all()`
- [ ] Timeout handling для каждого neuron
- [ ] Error isolation (failure одного не ломает остальные)
- [ ] Execution metrics (latency tracking)

---

## Phase 2: Base Neurons (Week 2)

### 2.1 SemanticIntentNeuron
**File**: `src/neurons-v2/neurons/semantic-intent.neuron.ts`

**Purpose**: Детекция намерений на основе семантического анализа

```typescript
class SemanticIntentNeuron implements NeuronPlugin {
  name = 'semantic-intent';
  type = 'intent_detector';
  
  // Activation: всегда активен для сообщений > 10 символов
  shouldActivate(context: DialogContext): boolean;
  
  async process(context: DialogContext): Promise<NeuronResult> {
    // 1. Get embedding for user message
    // 2. Classify intent using similarity search
    // 3. Return detected intents with confidence
  }
  
  private generateNeeds(intents: DetectedIntent[]): string[] {
    // Map intents to LLM requirements
    // code_generation -> architecture understanding
    // refactoring -> dependency analysis
    // debugging -> error analysis
  }
}
```

**Intent Types**:
- `code_generation` - создание кода
- `refactoring` - рефакторинг
- `debugging` - отладка
- `analysis` - анализ кода
- `question` - вопрос

**Requirements**:
- [ ] Интеграция с embedding service
- [ ] Confidence threshold (default: 0.7)
- [ ] Max intents limit (default: 3)
- [ ] Настраиваемые паттерны

### 2.2 FrameworkContextNeuron
**File**: `src/neurons-v2/neurons/framework-context.neuron.ts`

**Purpose**: Автоопределение фреймворков проекта

```typescript
class FrameworkContextNeuron implements NeuronPlugin {
  name = 'framework-context';
  type = 'context_enricher';
  
  shouldActivate(context: DialogContext): boolean {
    // Активен если фреймворк неизвестен
    return !context.metadata.framework;
  }
  
  async process(context: DialogContext): Promise<NeuronResult> {
    // 1. Analyze file structure
    // 2. Detect frameworks (Vue, Laravel, React, etc.)
    // 3. Return framework info with patterns
  }
}
```

**Detection Logic**:
- [ ] Vue: `vue`, `nuxt` в package.json
- [ ] Laravel: `artisan`, `composer.json`
- [ ] React: `react` в dependencies
- [ ] TypeScript: `tsconfig.json`

**Requirements**:
- [ ] Cache results (TTL: 3600s)
- [ ] Priority: 10 (high)
- [ ] Integration with simplified framework-detector

### 2.3 CodePatternNeuron
**File**: `src/neurons-v2/neurons/code-pattern.neuron.ts`

**Purpose**: Поиск похожих паттернов в кодовой базе

```typescript
class CodePatternNeuron implements NeuronPlugin {
  name = 'code-pattern';
  type = 'context_enricher';
  
  shouldActivate(context: DialogContext): boolean {
    // Активен если есть code files в контексте
    return context.files.some(f => f.type === 'code');
  }
  
  async process(context: DialogContext): Promise<NeuronResult> {
    // 1. Extract patterns from user request
    // 2. Search similar patterns in codebase
    // 3. Return top matches with relevance scores
  }
}
```

**Pattern Matching**:
- [ ] Function signatures
- [ ] Component structures
- [ ] Import patterns
- [ ] Naming conventions

**Requirements**:
- [ ] Max patterns limit (default: 5)
- [ ] Relevance threshold
- [ ] Integration with RAG for search

---

## Phase 3: Integration & Testing (Week 3)

### 3.1 Integration Points

**Context Enhancement**:
```typescript
interface EnrichedContext extends DialogContext {
  detectedIntents: DetectedIntent[];
  enrichments: EnrichmentData[];
  suggestedActions: SuggestedAction[];
  llmNeeds: string[];
  neuronMetadata: {
    executedPlugins: string[];
    executionTime: number;
    errors: string[];
  };
}
```

**Request.md Template**:
```markdown
## Neuron Analysis Results
{{#if neuron_results}}
### Detected Intents
{{#each neuron_results.detected_intents}}
- {{type}} (confidence: {{confidence}})
{{/each}}

### LLM Requirements
{{#each llmNeeds}}
{{@index}}. {{this}}
{{/each}}
{{/if}}
```

### 3.2 Testing Requirements

**Unit Tests** (`tests/neurons-v2/`):
- [ ] NeuronRegistry registration/unregistration
- [ ] NeuronOrchestrator parallel execution
- [ ] Individual neuron logic
- [ ] Error handling

**Integration Tests**:
- [ ] End-to-end dialog processing
- [ ] Performance benchmarks
- [ ] Memory leak detection

---

## Files to Create

```
src/neurons-v2/
├── index.ts                    # Public exports
├── types.ts                    # Type definitions
├── neuron-registry.ts          # Plugin registry
├── neuron-orchestrator.ts      # Execution engine
├── neurons/
│   ├── semantic-intent.neuron.ts
│   ├── framework-context.neuron.ts
│   └── code-pattern.neuron.ts
└── utils/
    └── context-merger.ts       # Result merging logic

tests/neurons-v2/
├── neuron-registry.test.ts
├── neuron-orchestrator.test.ts
└── neurons/
    ├── semantic-intent.test.ts
    ├── framework-context.test.ts
    └── code-pattern.test.ts
```

---

## Migration Path

1. **Phase 1**: Deploy NeuronRegistry + Orchestrator (parallel to old system)
2. **Phase 2**: Migrate external-ai-trigger.neuron.ts
3. **Phase 3**: Migrate file-collector.neuron.ts  
4. **Phase 4**: Deprecate old neuron system in `src/neurons/`
5. **Phase 5**: Remove old system (after 2 releases)

---

## Dependencies

- **Blocked by**: Task 23 (Simulation Syntax Extension)
- **Blocks**: Task 24 (Entity Recognizer Integration)
- **Related**: [`docs/neurons-architecture-v2.md`](docs/neurons-architecture-v2.md)

---

## Acceptance Criteria

- [ ] NeuronRegistry реализован и протестирован
- [ ] NeuronOrchestrator поддерживает parallel execution
- [ ] 3 базовых neurons реализованы (SemanticIntent, FrameworkContext, CodePattern)
- [ ] Интеграция с simulation syntax
- [ ] llmNeeds корректно генерируется и передаётся в request.md
- [ ] Все тесты проходят
- [ ] Performance: <100ms для execution всех neurons

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 22 of the current queue) and captured all requirements.
- 📌 Implementation remains pending; planning notes and dependencies were logged for follow-up work.
- 📝 Next steps: convert these requirements into executable work items in `a2a-server` once the implementation sprint begins (see `tasks/EXECUTION-LOG.md`).
