# Neurons Architecture v2: Intent Detection Plugins

## Overview

Новая архитектура neurons — это система плагинов-детекторов намерений, работающих в процессе диалога. Каждый neuron анализирует контекст и добавляет свои данные для помощи LLM в решении задачи.

## Core Concept

```
Dialog Flow:
User Request → Neuron Chain (parallel) → Enriched Context → LLM → Response
                ↓
         [Intent Detection]
         [Data Enrichment]
         [Context Augmentation]
```

## Neuron Types

### 1. Intent Detectors (Детекторы намерений)

Анализируют запрос пользователя и определяют намерения.

```typescript
interface IntentDetector {
  name: string;
  detect(context: DialogContext): DetectedIntent[];
}

interface DetectedIntent {
  type: 'code_generation' | 'refactoring' | 'debugging' | 'analysis' | 'question';
  confidence: number; // 0-1
  entities: Entity[];
  suggestedActions: string[];
}
```

**Examples:**
- `CodeGenerationDetector` — обнаруживает запросы на создание кода
- `RefactoringDetector` — обнаруживает намерение рефакторинга
- `DebugDetector` — распознаёт отладочные запросы

### 2. Context Enrichers (Обогатители контекста)

Добавляют релевантные данные в контекст.

```typescript
interface ContextEnricher {
  name: string;
  enrich(context: DialogContext): EnrichmentData[];
}

interface EnrichmentData {
  key: string;
  value: any;
  priority: number;
  ttl: number; // Time to live in seconds
}
```

**Examples:**
- `FrameworkDetector` — добавляет информацию о фреймворках проекта
- `PatternMatcher` — находит похожие паттерны в кодовой базе
- `ImportAnalyzer` — анализирует зависимости

### 3. Action Suggesters (Предлагающие действия)

Предлагают следующие шаги на основе контекста.

```typescript
interface ActionSuggester {
  name: string;
  suggest(context: DialogContext): SuggestedAction[];
}

interface SuggestedAction {
  action: string;
  reason: string;
  confidence: number;
  prerequisites: string[];
}
```

## Plugin System

### Registration

```typescript
// Neuron registration interface
interface NeuronPlugin {
  name: string;
  version: string;
  type: 'intent_detector' | 'context_enricher' | 'action_suggester';
  
  // Activation condition
  shouldActivate(context: DialogContext): boolean;
  
  // Main processing
  process(context: DialogContext): Promise<NeuronResult>;
  
  // Hooks
  onActivate?(): void;
  onDeactivate?(): void;
}

// Plugin registry
class NeuronRegistry {
  private plugins: Map<string, NeuronPlugin> = new Map();
  
  register(plugin: NeuronPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  getActivePlugins(context: DialogContext): NeuronPlugin[] {
    return Array.from(this.plugins.values())
      .filter(p => p.shouldActivate(context));
  }
}
```

### Execution Flow

```typescript
class NeuronOrchestrator {
  async processDialog(
    userRequest: string,
    currentContext: DialogContext
  ): Promise<EnrichedContext> {
    
    // 1. Get active plugins
    const activePlugins = this.registry.getActivePlugins(currentContext);
    
    // 2. Execute in parallel
    const results = await Promise.all(
      activePlugins.map(async plugin => {
        const startTime = Date.now();
        try {
          const result = await plugin.process(currentContext);
          return {
            plugin: plugin.name,
            success: true,
            result,
            latency: Date.now() - startTime
          };
        } catch (error) {
          return {
            plugin: plugin.name,
            success: false,
            error: error.message,
            latency: Date.now() - startTime
          };
        }
      })
    );
    
    // 3. Merge results into context
    const enrichedContext = this.mergeResults(currentContext, results);
    
    // 4. Add LLM requirements array
    enrichedContext.llmNeeds = this.generateLLMNeeds(results);
    
    return enrichedContext;
  }
  
  private generateLLMNeeds(results: NeuronResult[]): string[] {
    const needs: string[] = [];
    
    for (const result of results) {
      if (result.success && result.result.needs) {
        needs.push(...result.result.needs);
      }
    }
    
    // Deduplicate and prioritize
    return [...new Set(needs)].slice(0, 10);
  }
}
```

## Context Enhancement Format

### Input Context

```typescript
interface DialogContext {
  sessionId: string;
  requestId: string;
  userMessage: string;
  history: Message[];
  files: FileContext[];
  metadata: {
    projectType?: string;
    framework?: string;
    language?: string;
  };
}
```

### Output Context (Enriched)

```typescript
interface EnrichedContext extends DialogContext {
  // Detected intents from all neurons
  detectedIntents: DetectedIntent[];
  
  // Enriched data from context enrichers
  enrichments: EnrichmentData[];
  
  // Suggested actions
  suggestedActions: SuggestedAction[];
  
  // NEW: LLM requirements array
  llmNeeds: string[];
  
  // Plugin execution metadata
  neuronMetadata: {
    executedPlugins: string[];
    executionTime: number;
    errors: string[];
  };
}
```

## Example Neurons

### 1. SemanticIntentNeuron

```typescript
class SemanticIntentNeuron implements NeuronPlugin {
  name = 'semantic-intent';
  type = 'intent_detector';
  
  shouldActivate(context: DialogContext): boolean {
    return context.userMessage.length > 10;
  }
  
  async process(context: DialogContext): Promise<NeuronResult> {
    // Analyze with embeddings
    const embedding = await this.getEmbedding(context.userMessage);
    const intents = await this.classifyIntent(embedding);
    
    return {
      intents: intents.filter(i => i.confidence > 0.7),
      needs: this.generateNeeds(intents)
    };
  }
  
  private generateNeeds(intents: DetectedIntent[]): string[] {
    const needs: string[] = [];
    
    for (const intent of intents) {
      switch (intent.type) {
        case 'code_generation':
          needs.push('Требуется понимание архитектуры проекта');
          needs.push('Необходимы примеры похожего кода');
          break;
        case 'refactoring':
          needs.push('Требуется анализ зависимостей');
          needs.push('Необходимы тесты для проверки');
          break;
      }
    }
    
    return needs;
  }
}
```

### 2. FrameworkContextNeuron

```typescript
class FrameworkContextNeuron implements NeuronPlugin {
  name = 'framework-context';
  type = 'context_enricher';
  
  shouldActivate(context: DialogContext): boolean {
    return !context.metadata.framework;
  }
  
  async process(context: DialogContext): Promise<NeuronResult> {
    const framework = await this.detectFramework(context.files);
    
    return {
      enrichments: [{
        key: 'framework',
        value: framework,
        priority: 10,
        ttl: 3600
      }],
      needs: framework ? 
        [`Учитывай паттерны ${framework.name} в ответе`] : []
    };
  }
}
```

### 3. CodePatternNeuron

```typescript
class CodePatternNeuron implements NeuronPlugin {
  name = 'code-pattern';
  type = 'context_enricher';
  
  shouldActivate(context: DialogContext): boolean {
    return context.files.some(f => f.type === 'code');
  }
  
  async process(context: DialogContext): Promise<NeuronResult> {
    const patterns = await this.findRelevantPatterns(
      context.userMessage,
      context.files
    );
    
    return {
      enrichments: [{
        key: 'similar_patterns',
        value: patterns,
        priority: 5,
        ttl: 1800
      }],
      needs: patterns.length > 0 ? 
        ['Используй похожие паттерны из проекта'] : []
    };
  }
}
```

## Integration with Simulations

### Simulation Syntax Extension

```markdown
# Simulation: code-generation-smart

## Neurons
- semantic-intent: detect
- framework-context: enrich
- code-pattern: enrich

## Steps
1. **analyze**
   - Neurons analyze request
   - Collect llmNeeds array
   
2. **generate**
   - LLM receives enriched context
   - llmNeeds shown as requirements
   
3. **validate**
   - Validation neuron checks output
```

### Request.md Format

```markdown
# Request

## User Message
{{userMessage}}

## Context
{{enrichedContext}}

## LLM Requirements (auto-generated)
{{#each llmNeeds}}
- {{this}}
{{/each}}

## Available Patterns
{{similar_patterns}}

## Detected Intent
{{detectedIntents.0.type}} (confidence: {{detectedIntents.0.confidence}})
```

## Configuration

```json
{
  "neurons": {
    "enabled": [
      "semantic-intent",
      "framework-context",
      "code-pattern",
      "import-analyzer"
    ],
    "config": {
      "semantic-intent": {
        "confidenceThreshold": 0.7,
        "maxIntents": 3
      },
      "framework-context": {
        "cacheTtl": 3600
      }
    }
  }
}
```

## Benefits

1. **Modularity** — каждый neuron независимый плагин
2. **Parallel Execution** — все neurons работают параллельно
3. **Context Enrichment** — богатый контекст для LLM
4. **LLM Guidance** — явные требования через llmNeeds
5. **Extensibility** — легко добавлять новые neurons

## Migration Path

1. **Phase 1**: Create base infrastructure (NeuronRegistry, Orchestrator)
2. **Phase 2**: Migrate existing useful detectors to new format
3. **Phase 3**: Create new intent-specific neurons
4. **Phase 4**: Update simulations to use neuron syntax
5. **Phase 5**: Deprecate old neuron system
