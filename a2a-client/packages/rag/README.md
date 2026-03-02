# @a2a/rag - RAG Indexing and Search Module

[![npm version](https://img.shields.io/npm/v/@a2a/rag.svg)](https://www.npmjs.com/package/@a2a/rag)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

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

## Testing

> Comprehensive test infrastructure for RAG package validation

The RAG package includes a full-featured test suite covering functional, performance, accuracy, and edge-case testing.

### Test Categories

| Category | Description |
|---------|-------------|
| **Functional** | Basic search functionality, indexing, chunking |
| **Performance** | Search speed, memory usage, load testing |
| **Accuracy** | Precision, recall, F1 score, relevance metrics |
| **Edge Cases** | Boundary conditions, error handling, robustness |

### Running Tests

```bash
# Run all tests with default configuration
npm test

# Run with custom preset
npm test -- --preset=performance

# Run specific test categories
npm test -- --categories=functional,accuracy

# Run with verbose output
npm test -- --verbose
```

### Test Presets

The test system supports multiple configuration presets:

| Preset | Description | Use Case |
|--------|-------------|----------|
| `default` | Standard configuration | Regular development |
| `performance` | Stricter thresholds | CI/CD performance checks |
| `smoke` | Minimal config (3 files) | Quick validation |
| `stress` | Large-scale (50+ files) | Stress testing |

```javascript
// Programmatic usage
import { RAGTestRunner } from './tests/runner.js';

// Using preset
const runner = new RAGTestRunner('performance');
await runner.initialize();
const report = await runner.runAll();
```

### Environment Variables

Configure tests via environment variables:

| Variable | Description | Default |
|---------|-------------|---------|
| `TEST_DATA_DIR` | Test data directory | `./test-data` |
| `TEST_OUTPUT_DIR` | Generated files output | `./test-data/output` |
| `THRESHOLD_SEARCH_TIME_MS` | Max search time (ms) | `100` |
| `THRESHOLD_ACCURACY` | Min accuracy (0-1) | `0.8` |
| `THRESHOLD_MEMORY_MB` | Max memory (MB) | `100` |
| `TEST_FILES_PER_TYPE` | Files per type | `10` |
| `TEST_AVG_FILE_SIZE` | Avg file size (lines) | `100` |

```bash
# Example: Run performance tests with custom thresholds
THRESHOLD_SEARCH_TIME_MS=50 \
THRESHOLD_ACCURACY=0.85 \
npm test
```

### Test Data Generation

Tests automatically generate synthetic code files for validation:

```javascript
import { TestDataGenerator, generateTestData } from './test-data/generator.js';

const generator = new TestDataGenerator({
  outputDir: './test-data/output',
  fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
  filesPerType: 10,
  avgLinesPerFile: 100,
  complexity: 3,
  seed: 12345, // Reproducible results
});

const dataset = await generator.generateAll();
```

## Test Reports

> Multiple report formats for different needs

### Report Formats

#### Markdown Report

Human-readable documentation format with recommendations:

```javascript
import { generateMarkdownReport } from './tests/reporter.js';

const markdown = generateMarkdownReport(report, {
  includeRecommendations: true,
  includeFailedDetails: true,
  title: 'RAG Test Report',
  version: '1.0.0',
});
```

#### JSON Report

Machine-processable format for CI/CD integration:

```javascript
import { generateJSONReport } from './tests/reporter.js';

const json = generateJSONReport(report, {
  includeFullResults: true,
  includeConfig: true,
  pretty: true,
});

// Save to file
await fs.writeFile('test-report.json', JSON.stringify(json, null, 2));
```

#### HTML Report

Interactive visual report with charts:

```javascript
import { generateHTMLReport } from './tests/reporter.js';

const html = generateHTMLReport(report, {
  includeCharts: true,
  darkMode: false,
  title: 'RAG Test Results',
});

await fs.writeFile('test-report.html', html);
```

### Console Output

Real-time colored output during test execution:

```javascript
import { consoleReporter } from './tests/reporter.js';

consoleReporter(report, {
  colors: true,
  verbose: true,
  showProgress: true,
  maxFailedDisplay: 10,
});
```

### Metrics Visualization

Test reports include comprehensive metrics:

| Metric | Description |
|--------|-------------|
| **Precision** | Relevant results / Total retrieved |
| **Recall** | Relevant retrieved / Total relevant |
| **F1 Score** | Harmonic mean of precision/recall |
| **MAP@K** | Mean Average Precision at K |
| **NDCG** | Normalized Discounted Cumulative Gain |
| **MRR** | Mean Reciprocal Rank |

## CI/CD Integration

> Automated testing in continuous integration pipelines

### GitHub Actions

Example workflow (`.github/workflows/rag-tests.yml`):

```yaml
name: RAG Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
        env:
          THRESHOLD_SEARCH_TIME_MS: 100
          THRESHOLD_ACCURACY: 0.8
      
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-reports
          path: test-data/reports/
      
      - name: Generate Markdown report
        run: |
          npm test -- --report-format=markdown
```

### Test Status Badges

Add badges to your README:

```markdown
[![RAG Tests](https://github.com/org-carrier/a2a-app/actions/workflows/rag-tests.yml/badge.svg)](https://github.com/org-carrier/a2a-app/actions/workflows/rag-tests.yml)
[![Coverage](https://img.shields.io/codecov/c/github/org-carrier/a2a-app?flag=rag)](https://app.codecov.io/gh/org-carrier/a2a-app)
```

### Local CI/CD Setup

Run the same tests locally as in CI:

```bash
# Install CI dependencies
npm ci

# Run with CI environment
CI=true npm test

# Generate all report formats
npm test -- --report-format=all

# Exit with error code on test failure
npm test -- --bail
```

## Scripts

> Available npm scripts for development and testing

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests with Jest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run with coverage report |
| `npm run test:smoke` | Run smoke tests only |
| `npm run test:performance` | Run performance tests |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Run linter |

```bash
# Quick smoke test
npm run test:smoke

# Full performance validation
npm run test:performance

# With coverage
npm run test:coverage

# Build the package
npm run build
```

## Configuration

> Comprehensive configuration options for RAG and testing

### RAG Configuration

```javascript
const rag = createRAG({
  projectPath: '/path/to/project',
  includePatterns: ['*.php', '*.vue', '*.js'],
  excludePatterns: ['node_modules/**', 'vendor/**'],
  useTFIDF: true,
  useBM25: true,
  useSemantic: false, // Requires embedding service
});
```

### Test Thresholds

Configure performance and accuracy thresholds:

```javascript
const config = {
  thresholds: {
    searchTimeMs: 100,        // Max search time in ms
    accuracyThreshold: 0.8,    // Min precision/recall (0-1)
    memoryUsageMb: 100,       // Max memory in MB
    indexBuildTimeMs: 5000,   // Max index build time
  },
  
  dataGeneration: {
    filesPerType: 10,         // Files per file type
    avgFileSizeLines: 100,    // Average lines per file
    fileSizeVariance: 0.3,    // Size variance factor
    varyComplexity: true,    // Vary code complexity
  },
  
  search: {
    defaultLimit: 10,
    useTFIDF: true,
    useBM25: true,
    useSemantic: false,
  },
};

// Load configuration
import { loadConfig, getConfigByPreset } from './tests/config.js';

// Use preset
const config = getConfigByPreset('performance');

// Or custom
const customConfig = loadConfig({
  thresholds: { searchTimeMs: 50 },
});
```

### Environment Variables for Tests

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TEST_DATA_DIR` | string | `./test-data` | Test data directory |
| `TEST_OUTPUT_DIR` | string | `./test-data/output` | Generated files output |
| `THRESHOLD_SEARCH_TIME_MS` | number | `100` | Max search time (ms) |
| `THRESHOLD_ACCURACY` | number | `0.8` | Min accuracy (0-1) |
| `THRESHOLD_MEMORY_MB` | number | `100` | Max memory (MB) |
| `THRESHOLD_INDEX_BUILD_MS` | number | `5000` | Max index build time |
| `TEST_FILES_PER_TYPE` | number | `10` | Files per type |
| `TEST_AVG_FILE_SIZE` | number | `100` | Avg file size (lines) |
| `PERF_THRESHOLD_SEARCH_MS` | number | `50` | Perf test search time |
| `PERF_THRESHOLD_ACCURACY` | number | `0.85` | Perf test accuracy |
| `PERF_THRESHOLD_MEMORY_MB` | number | `150` | Perf test memory |

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
