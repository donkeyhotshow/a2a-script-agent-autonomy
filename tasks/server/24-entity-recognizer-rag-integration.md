# Task 24: Entity Recognizer RAG Integration

## Goal
Интегрировать entity-recognizer.service.ts с rag.service.ts для smart file selection на основе entity recognition.

## Priority
**P1 (High)**

## Estimated Time
1 неделя

## Background
Согласно [`docs/server-cleanup-decisions.md`](docs/server-cleanup-decisions.md), решено **KEEP** entity-recognizer.service.ts (~21,000 строк) и интегрировать его с RAG для умного выбора файлов. Сервис содержит ценную логику распознавания сущностей для PHP и Vue файлов.

---

## Current State

### Entity Recognizer (`src/services/entity-recognizer.service.ts`)
- **Size**: ~21,000 строк
- **Entities**: PHP (Model, Controller, Service, Request), Vue (Component, Page)
- **Features**: Class detection, relations, methods, imports, patterns
- **Dependencies**: Graph Store, Framework Extractor

### RAG Service (`src/services/rag.service.ts`)
- Vector-based file search
- Semantic similarity
- Context-aware retrieval
- Нет понимания code entities

---

## Integration Architecture

```
User Request
    ↓
Entity Analysis (entity-recognizer)
    ↓
Entity Query Builder
    ↓
RAG Search (enhanced with entities)
    ↓
Smart File Selection (scored by relevance)
    ↓
Context Assembly
```

---

## Phase 1: Entity Query Builder (Days 1-2)

### 1.1 Entity Query Interface
**File**: `src/services/rag/entity-query-builder.ts`

```typescript
interface EntityQuery {
  types: EntityTypeName[];           // ['model', 'controller']
  names: string[];                   // ['User', 'OrderController']
  relations: string[];               // ['belongsTo', 'hasMany']
  filePatterns: string[];            // ['*.php', '*.vue']
  contextDepth: number;              // How many related files to include
}

interface EntitySearchResult {
  file: string;
  entities: RecognizedEntity[];
  relevanceScore: number;
  relationshipDistance: number;
}

class EntityQueryBuilder {
  constructor(private entityRecognizer: EntityRecognizerService);
  
  buildFromRequest(request: string): EntityQuery;
  
  buildFromContext(
    files: string[],
    context: DialogContext
  ): EntityQuery;
  
  private extractEntityMentions(text: string): string[];
  private inferEntityTypes(request: string): EntityTypeName[];
}
```

**Requirements**:
- [ ] Извлечение упоминаний entities из запроса пользователя
- [ ] Определение типов entities (model, controller, component)
- [ ] Построение запроса на основе контекста

### 1.2 Entity Mention Extraction
```typescript
// Extract "User model", "OrderController" from request
const patterns = {
  model: /\b(\w+)\s+(?:model|модель)\b/gi,
  controller: /\b(\w+)\s+(?:controller|контроллер)\b/gi,
  component: /\b(\w+)\s+(?:component|компонент)\b/gi,
  service: /\b(\w+)\s+(?:service|сервис)\b/gi,
};
```

---

## Phase 2: Smart File Selection (Days 3-4)

### 2.1 Entity-Aware File Scorer
**File**: `src/services/rag/entity-file-scorer.ts`

```typescript
interface FileScore {
  file: string;
  baseScore: number;           // From RAG similarity
  entityScore: number;         // From entity matching
  relationshipScore: number;   // From entity graph
  finalScore: number;
}

interface ScoringConfig {
  baseWeight: number;          // 0.4
  entityWeight: number;        // 0.4
  relationshipWeight: number;  // 0.2
}

class EntityFileScorer {
  constructor(
    private graphStore: GraphStoreService,
    private config: ScoringConfig
  );
  
  scoreFiles(
    ragResults: RAGResult[],
    query: EntityQuery
  ): FileScore[] {
    // 1. Score by entity matches
    // 2. Score by relationships
    // 3. Combine with RAG scores
    // 4. Return sorted results
  }
  
  private calculateEntityScore(
    file: string,
    entities: RecognizedEntity[],
    query: EntityQuery
  ): number;
  
  private calculateRelationshipScore(
    file: string,
    query: EntityQuery
  ): number;
}
```

**Scoring Algorithm**:
- **Exact entity match**: +1.0
- **Related entity**: +0.5
- **Same namespace**: +0.3
- **Referenced in imports**: +0.2
- **RAG similarity**: normalized to 0-1

### 2.2 Context Assembly with Entities
```typescript
interface EnrichedContextFile {
  path: string;
  content: string;
  entities: RecognizedEntity[];
  relatedFiles: string[];
  relevanceExplanation: string;
}

class EntityContextAssembler {
  assemble(
    scoredFiles: FileScore[],
    maxFiles: number,
    maxTokens: number
  ): EnrichedContextFile[] {
    // 1. Select top files by score
    // 2. Add related files (dependencies)
    // 3. Build entity descriptions
    // 4. Respect token limits
  }
}
```

---

## Phase 3: RAG Service Integration (Days 5-6)

### 3.1 Enhanced RAG Search
**File**: `src/services/rag.service.ts` (modifications)

```typescript
interface RAGSearchOptions {
  query: string;
  useEntityRecognition?: boolean;  // NEW
  entityContext?: EntityQuery;     // NEW
  maxResults: number;
}

class RAGService {
  constructor(
    private vectorStore: VectorStore,
    private entityRecognizer: EntityRecognizerService,  // NEW
    private entityScorer: EntityFileScorer              // NEW
  );
  
  async search(options: RAGSearchOptions): Promise<RAGResult[]> {
    // 1. Standard vector search
    const vectorResults = await this.vectorStore.search(options.query);
    
    if (!options.useEntityRecognition) {
      return vectorResults;
    }
    
    // 2. Build entity query
    const entityQuery = options.entityContext || 
      this.entityQueryBuilder.buildFromRequest(options.query);
    
    // 3. Score with entities
    const scoredFiles = this.entityScorer.scoreFiles(
      vectorResults,
      entityQuery
    );
    
    // 4. Return enriched results
    return this.enrichResults(scoredFiles);
  }
}
```

### 3.2 Integration Points

**Neuron Integration**:
```typescript
// In CodePatternNeuron
async process(context: DialogContext): Promise<NeuronResult> {
  // Use entity-aware RAG for pattern matching
  const results = await this.ragService.search({
    query: context.userMessage,
    useEntityRecognition: true,
    maxResults: 5
  });
  
  return {
    enrichments: [{
      key: 'similar_patterns',
      value: results.map(r => ({
        file: r.file,
        entities: r.entities,
        relevance: r.score
      }))
    }]
  };
}
```

---

## Phase 4: Testing & Optimization (Day 7)

### 4.1 Integration Tests
**File**: `tests/services/rag-entity-integration.test.ts`

```typescript
describe('Entity-Aware RAG', () => {
  it('should boost files with matching entities', async () => {
    // Test scoring algorithm
  });
  
  it('should find related files via entity graph', async () => {
    // Test relationship traversal
  });
  
  it('should respect token limits with entity context', async () => {
    // Test context assembly
  });
});
```

### 4.2 Performance Tests
- [ ] Entity extraction: <50ms per file
- [ ] Query building: <10ms
- [ ] Scoring overhead: <20% of base RAG time
- [ ] Memory usage for entity graph

---

## Files to Create/Modify

```
src/services/
├── rag.service.ts                      # MODIFY: Add entity integration
├── entity-recognizer.service.ts        # MODIFY: Add query interface
└── rag/
    ├── entity-query-builder.ts         # CREATE
    ├── entity-file-scorer.ts           # CREATE
    └── entity-context-assembler.ts     # CREATE

tests/services/
└── rag-entity-integration.test.ts      # CREATE
```

---

## Usage Examples

### Example 1: coder-smart Simulation
```typescript
// In request processor
const ragResults = await ragService.search({
  query: "Create UserController with store method",
  useEntityRecognition: true,
  maxResults: 10
});

// Results will include:
// 1. Existing User model (high entity score)
// 2. BaseController (relationship score)
// 3. Similar controllers (pattern match)
// 4. UserRequest (related file)
```

### Example 2: Framework Context
```typescript
// Neuron uses entity-aware RAG
const neuron = new FrameworkContextNeuron(ragService);
const result = await neuron.process(context);

// Enrichment includes framework-specific entities
// detected from related files
```

---

## Dependencies

- **Blocked by**: Task 22 (Neurons v2 Implementation), Task 25 (Framework Detector)
- **Blocks**: None
- **Related**: 
  - [`docs/server-cleanup-decisions.md`](docs/server-cleanup-decisions.md)
  - [`src/services/entity-recognizer.service.ts`](a2a-server/src/services/entity-recognizer.service.ts)

---

## Acceptance Criteria

- [x] EntityQueryBuilder извлекает entities из запроса
- [x] EntityFileScorer ранжирует файлы по entity relevance
- [x] RAGService интегрирован с entity recognition
- [ ] Smart file selection работает для coder-smart симуляций
- [x] Все тесты проходят
- [ ] Performance overhead <30% от базового RAG
- [ ] Документация обновлена

## Status
- ✅ Entity scoring + context assembly implementations (`entity-file-scorer.ts`, `entity-context-assembler.ts`) now power `rag.service.ts` so enriched results and context are emitted whenever `useEntityRecognition` is requested.
- ✅ Added `tests/services/rag-entity-integration.test.ts` to verify the scoring heuristics and context assembler (run via `ENCRYPTION_KEY=1234567890ABCDEF1234567890ABCDEF A2A_DEFAULT_EMAIL=test@example.com A2A_DEFAULT_PASSWORD=dev npm run test --prefix a2a-server -- tests/services/rag-entity-integration.test.ts`).
- 🧪 Next steps: surface the enriched RAG results inside downstream neurons (e.g., coder-smart), monitor the smart selection outcome in simulations, and capture the performance story before claiming the feature is production ready.
