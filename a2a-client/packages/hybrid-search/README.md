# @a2a/hybrid-search

Hybrid Search combining multiple indexing methods for comprehensive codebase search.

## Features

- **Multi-Method Search**: Combines RAG, Full-Text, and Graph search
- **Auto Strategy**: Automatically selects the best search strategy
- **Smart Ranking**: Combines scores from multiple methods
- **Strategy Comparison**: Compare different search strategies
- **Configurable Weights**: Adjust importance of each method

## Installation

```bash
npm install @a2a/hybrid-search
```

## Usage

### Basic Setup

```javascript
const { createHybridSearch } = require('@a2a/hybrid-search');

const hybrid = createHybridSearch({
  projectPath: '/path/to/project',
  weights: {
    rag: 0.3,      // 30% weight for RAG
    fulltext: 0.4, // 40% weight for Full-Text
    graph: 0.3     // 30% weight for Graph
  },
  autoStrategy: true
});
```

### Smart Search

```javascript
// Smart search with automatic strategy selection
const results = await hybrid.search('ProductController', {
  limit: 10
});

console.log(`Strategy: ${results.strategy}`);
console.log(`Methods used: ${results.methods.join(', ')}`);
console.log(`Total results: ${results.totalResults}`);

results.items.forEach(r => {
  console.log(`[${r.combinedScore.toFixed(2)}] ${r.chunk.filePath}`);
  console.log(`  Methods: ${r.methods.join(', ')}`);
  console.log(`  Scores:`, r.scores);
});
```

### Specific Strategy

```javascript
// Use specific strategy
const results = await hybrid.search('authentication', {
  strategy: 'rag+fulltext',  // Combine RAG and Full-Text
  limit: 10
});
```

### Compare Strategies

```javascript
// Compare different strategies
const comparison = await hybrid.compareStrategies('email validation', {
  strategies: ['rag', 'fulltext', 'hybrid'],
  limit: 10
});

for (const [strategy, data] of Object.entries(comparison)) {
  console.log(`${strategy}: ${data.resultsCount} results (${data.duration}ms)`);
  data.topResults.forEach(r => {
    console.log(`  ${r.filePath} (${r.score})`);
  });
}
```

### Get Statistics

```javascript
const stats = await hybrid.getStats();

console.log('Available methods:', Object.keys(stats.methods));
console.log('Weights:', stats.weights);

for (const [method, methodStats] of Object.entries(stats.methods)) {
  console.log(`${method}: ${methodStats.totalDocuments} documents`);
}
```

## Search Strategies

### Automatic Strategy Selection

The hybrid searcher analyzes the query and selects the best strategy:

| Query Type | Example | Strategy |
|------------|---------|----------|
| **Exact** | `ProductController` | `fulltext` |
| **Semantic** | `как работает авторизация` | `hybrid` |
| **Phrase** | `email validation rules` | `fulltext+rag` |
| **File** | `app/Models/User.php` | `fulltext` |
| **General** | `authentication` | `hybrid` |

### Manual Strategy Selection

```javascript
// Single method
await hybrid.search('query', { strategy: 'rag' });
await hybrid.search('query', { strategy: 'fulltext' });
await hybrid.search('query', { strategy: 'graph' });

// Combined methods
await hybrid.search('query', { strategy: 'rag+fulltext' });
await hybrid.search('query', { strategy: 'fulltext+graph' });
await hybrid.search('query', { strategy: 'rag+fulltext+graph' });

// Hybrid (all methods combined)
await hybrid.search('query', { strategy: 'hybrid' });
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectPath` | string | `process.cwd()` | Path to project |
| `weights.rag` | number | `0.3` | Weight for RAG results |
| `weights.fulltext` | number | `0.4` | Weight for Full-Text results |
| `weights.graph` | number | `0.3` | Weight for Graph results |
| `autoStrategy` | boolean | `true` | Enable automatic strategy selection |
| `defaultStrategy` | string | `'hybrid'` | Default strategy to use |

## Result Structure

```javascript
{
  strategy: 'hybrid',
  methods: ['rag', 'fulltext'],
  totalResults: 25,
  items: [
    {
      chunk: {
        id: 'app/Models/User.php:10',
        filePath: 'app/Models/User.php',
        type: 'class',
        name: 'User',
        content: 'class User extends Model {...',
        startLine: 10,
        endLine: 50
      },
      combinedScore: 15.5,
      methods: ['rag', 'fulltext'],
      scores: {
        rag: 12.0,
        fulltext: 18.0
      }
    }
  ]
}
```

## How It Works

### 1. Query Analysis

```javascript
analyzeQuery(query) {
  // Detects query type:
  // - exact: Class/function names
  // - semantic: Questions, descriptions
  // - phrase: Multi-word queries
  // - file: File paths
  // - general: Default
}
```

### 2. Strategy Selection

```javascript
selectStrategy(queryType) {
  // Selects best strategy based on query type:
  // - exact -> fulltext
  // - semantic -> hybrid
  // - phrase -> fulltext+rag
  // - file -> fulltext
  // - general -> hybrid
}
```

### 3. Multi-Method Search

```javascript
// Executes search with each method
const ragResults = await ragSearcher.search(query);
const fulltextResults = await fulltextSearcher.search(query);
const graphResults = await graphSearcher.search(query);
```

### 4. Result Merging

```javascript
// Combines results with weighted scores
combinedScore = (ragScore * ragWeight) + 
                (fulltextScore * fulltextWeight) + 
                (graphScore * graphWeight);
```

## Performance

| Strategy | Speed | Accuracy | Best For |
|----------|-------|----------|----------|
| `rag` | ⚡⚡⚡ 50ms | ⭐⭐ 60% | Keyword search |
| `fulltext` | ⚡⚡⚡⚡ 10ms | ⭐⭐⭐ 75% | Exact matches |
| `hybrid` | ⚡⚡ 80ms | ⭐⭐⭐⭐⭐ 90% | Comprehensive search |

## Examples

### Example 1: Quick Search

```javascript
const { createHybridSearch } = require('@a2a/hybrid-search');

async function quickSearch() {
  const hybrid = createHybridSearch({ projectPath: './my-project' });
  
  const results = await hybrid.search('authentication', { limit: 5 });
  
  console.log(`Strategy: ${results.strategy}`);
  results.items.forEach(r => {
    console.log(`${r.chunk.filePath} (score: ${r.combinedScore})`);
  });
}

quickSearch().catch(console.error);
```

### Example 2: Compare Methods

```javascript
const { HybridSearcher } = require('@a2a/hybrid-search');

async function compareMethods() {
  const searcher = new HybridSearcher({ projectPath: './my-project' });
  
  const comparison = await searcher.compareStrategies('validation', {
    strategies: ['rag', 'fulltext', 'hybrid'],
    limit: 10
  });
  
  console.log('Comparison results:');
  for (const [strategy, data] of Object.entries(comparison)) {
    console.log(`  ${strategy}: ${data.resultsCount} results in ${data.duration}ms`);
  }
}

compareMethods().catch(console.error);
```

### Example 3: Custom Weights

```javascript
const { createHybridSearch } = require('@a2a/hybrid-search');

const hybrid = createHybridSearch({
  projectPath: './my-project',
  weights: {
    rag: 0.2,      // Less weight for keyword search
    fulltext: 0.5, // More weight for full-text
    graph: 0.3     // Standard weight for graph
  }
});

// Now full-text results will have more influence
const results = await hybrid.search('ProductController');
```

## Integration with Other Packages

```javascript
// Use with RAG
const { createRAG } = require('@a2a/rag');
const rag = createRAG({ projectPath: './project' });
await rag.indexer.indexProject();

// Use with Full-Text
const { createFullText } = require('@a2a/fulltext');
const fulltext = createFullText({ projectPath: './project' });
await fulltext.index();

// Hybrid will use both
const hybrid = createHybridSearch({ projectPath: './project' });
const results = await hybrid.search('query');
```

## License

MIT
