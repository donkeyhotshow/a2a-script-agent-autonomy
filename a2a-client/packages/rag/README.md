# @a2a/rag - RAG Indexing and Search Module

> Provides local indexing and search capabilities for code projects with BM25, hybrid search, semantic search, query
> understanding, and more.

## Features

- **Keyword-based search** with technical term extraction
- **TF-IDF/BM25 sparse retrieval** for exact code matching
- **Hybrid search** combining sparse and dense methods
- **Semantic search** with embedding models (Ollama)
- **Meilisearch integration** for production-grade full-text search
- **Cross-encoder reranking** with Cohere/Jina API
- **AST-based chunking** for accurate code parsing
- **Query understanding** with intent detection
- **Search suggestions** with autocomplete
- **Code similarity** detection for duplicate finding

## Installation

```bash
npm install @a2a/rag
```

## Quick Start

```javascript
const { createRAG } = require('@a2a/rag');

const rag = createRAG({
  projectPath: '/path/to/project',
  useTFIDF: true,
  useBM25: true,
  useSemantic: true,
});

// Index files
await rag.indexer.indexDirectory();

// Search
const results = await rag.searcher.search('UserService');
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        @a2a/rag                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   Chunk      │  │   Indexer    │  │   Searcher   │        │
│   │   Manager    │  │              │  │              │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │    TF-IDF    │  │     BM25     │  │   Semantic   │        │
│   │              │  │              │  │   Search     │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   Hybrid     │  │   Reranker   │  │  Meilisearch │        │
│   │   Search     │  │   (Cohere)   │  │   Client     │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │    Query     │  │  Suggestions │  │  Similarity   │        │
│   │ Understanding│  │              │  │  Detection   │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Modules

### createRAG(config)

Creates a RAG instance with indexer and searcher.

```javascript
const rag = createRAG({
  projectPath: '/path/to/project',
  includePatterns: ['*.php', '*.vue', '*.js'],
  excludePatterns: ['node_modules/**', 'vendor/**'],
  useTFIDF: true,
  useBM25: false,
  useSemantic: false,
});
```

## Advanced Search Features

### BM25 Scorer

Okapi BM25 implementation for better code search.

```javascript
const { createBM25Scorer } = require('@a2a/rag');

const bm25 = createBM25Scorer({ k1: 1.5, b: 0.75 });
bm25.addDocument('doc1', 'UserService handles user operations');
const results = bm25.search('user service', { limit: 10 });
```

### Hybrid Search

Combines sparse (BM25) and dense (vector) search using RRF.

```javascript
const { createHybridSearcher } = require('@a2a/rag');

const hybrid = createHybridSearcher({
  sparseSearch: bm25Scorer,
  denseSearch: semanticSearcher,
  sparseWeight: 0.7,
  denseWeight: 0.3,
});

const results = await hybrid.search('UserService methods');
```

### Reranking

Cross-encoder reranking with Cohere or Jina API.

```javascript
const { createReranker } = require('@a2a/rag');

const reranker = createReranker({
  provider: 'cohere',
  apiKey: process.env.COHERE_API_KEY,
});

const reranked = await reranker.rerank(
  'UserService methods',
  [{ id: '1', content: 'class UserService...' }],
  { topN: 5 }
);
```

### Query Understanding

Analyzes search queries to detect intent and optimize search.

```javascript
const { createQueryUnderstandingEngine, INTENT_TYPES } = require('@a2a/rag');

const engine = createQueryUnderstandingEngine();

const analysis = engine.analyze('UserService');
// {
//   type: 'exact_name',
//   confidence: 0.95,
//   terms: ['userservice'],
//   entities: { frameworks: [], fileTypes: [], symbols: ['UserService'] },
//   suggestions: ['UserService', 'UserServiceService', 'UserServiceController'],
//   modifiers: { isNegation: false, isFuzzy: false, isExact: false, isWildcard: false }
// }

// Intent types: exact_name, code_pattern, semantic, dependency, file_path, symbol, documentation, mixed
```

**Detected Intents:**

- `exact_name` - "UserService", "createUser()"
- `code_pattern` - "->createUser(", "$user->"
- `semantic` - "how to create user"
- `dependency` - "who uses UserService"
- `file_path` - "app/Models/User"
- `symbol` - "class User", "function login"
- `documentation` - "laravel docs"

### Search Suggestions

Intelligent autocomplete based on indexed code symbols.

```javascript
const { createSuggestionsEngine } = require('@a2a/rag');

const suggestions = createSuggestionsEngine({ maxSuggestions: 10 });

// Index symbols from chunks
suggestions.indexSymbols([
  { name: 'UserService', type: 'class', filePath: 'app/Services/UserService.php' },
  { name: 'createUser', type: 'method', filePath: 'app/Services/UserService.php' },
]);

// Get suggestions
const results = suggestions.getSuggestions('User');
// [{ text: 'UserService', type: 'class', filePath: '...', score: 100 }]

// Get by type
const classes = suggestions.getByType('class', 5);
```

**Features:**

- Prefix-based matching
- Frequency-based ranking
- Type preferences (class > function > method)
- Case sensitivity preservation

### Code Similarity Detection

Finds similar code patterns across the codebase.

```javascript
const { createSimilarityEngine } = require('@a2a/rag');

const similarity = createSimilarityEngine({ minSimilarity: 0.3 });

// Index chunks
similarity.index(chunks);

// Find similar code
const similar = similarity.findSimilar('function createUser() { ... }', {
  method: 'jaccard',  // jaccard, cosine, overlap, dice
  threshold: 0.3,
  limit: 5,
});

// Find duplicate code
const duplicates = similarity.findDuplicates({ threshold: 0.8 });
```

**Similarity Metrics:**

- **Jaccard** - Intersection over Union
- **Cosine** - Vector cosine similarity
- **Overlap** - Overlap coefficient
- **Dice** - Dice coefficient

### Query Expander

Expands queries with related terms based on search history.

```javascript
const { createQueryExpander } = require('@a2a/rag');

const expander = createQueryExpander();

// Add term relations
expander.addRelation('user', 'UserService', 1);
expander.addRelation('user', 'UserController', 0.8);

// Expand query
const expanded = expander.expand('user authentication');
// ['user', 'authentication', 'UserService', 'UserController']

// Learn from clicks
expander.learn('login', 'AuthController');
```

## Complete Search Pipeline

```javascript
const { 
  createHybridSearcher, createReranker, createMeilisearchClient,
  createQueryUnderstandingEngine, createSuggestionsEngine,
  createSimilarityEngine 
} = require('@a2a/rag');

async function searchPipeline(query) {
  // 1. Understand query intent
  const understanding = createQueryUnderstandingEngine();
  const analysis = understanding.analyze(query);
  
  // 2. Get suggestions
  const suggestionsEngine = createSuggestionsEngine();
  suggestionsEngine.indexSymbols(chunks);
  const suggestions = suggestionsEngine.getSuggestions(query, { limit: 5 });
  
  // 3. Execute hybrid search
  const hybrid = createHybridSearcher({ sparseWeight: 0.7, denseWeight: 0.3 });
  const results = await hybrid.search(query, { limit: 50 });
  
  // 4. Rerank results
  const reranker = createReranker({ provider: 'cohere', apiKey: process.env.COHERE_API_KEY });
  const reranked = await reranker.rerank(query, results, { topN: 10 });
  
  return {
    analysis,
    suggestions,
    results: reranked,
  };
}
```

## API Reference

| Module                           | Description             |
|----------------------------------|-------------------------|
| `createRAG`                      | Main RAG factory        |
| `createBM25Scorer`               | BM25 ranking            |
| `createHybridSearcher`           | Hybrid search           |
| `createReranker`                 | Cross-encoder reranking |
| `createMeilisearchClient`        | Meilisearch client      |
| `createASTChunker`               | AST-based chunking      |
| `createQueryUnderstandingEngine` | Intent detection        |
| `createSuggestionsEngine`        | Autocomplete            |
| `createQueryExpander`            | Query expansion         |
| `createSimilarityEngine`         | Code similarity         |

## Best Practices

1. **Use BM25 for code** - BM25 outperforms TF-IDF for exact code matching
2. **Hybrid for mixed queries** - Combine sparse + dense for best results
3. **Query understanding** - Analyze intent before searching
4. **Rerank for quality** - Add reranking as final step
5. **Similarity for refactoring** - Find duplicate code before refactoring

## License

MIT
