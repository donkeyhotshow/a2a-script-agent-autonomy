# RAG Package Usage Examples

## Basic Setup

```typescript
import { createRAG } from '@a2a/rag';

const rag = createRAG({
    projectPath: '/path/to/project',
    includePatterns: ['**/*.ts', '**/*.js', '**/*.vue'],
    excludePatterns: ['node_modules/**', 'dist/**'],
});
```

## Indexing

### Standard Indexing (Sequential)
```typescript
const index = await rag.indexer.indexProject();
console.log(`Indexed ${index.files.length} files`);
```

### Parallel Indexing (Faster for large projects)
```typescript
// Process 20 files at a time
const index = await rag.indexer.indexProjectParallel(20);
```

### Index Health Check
```typescript
const health = await rag.indexer.health();
console.log(`Coverage: ${(health.coverage * 100).toFixed(1)}%`);
console.log(`Stale files: ${health.staleFiles.length}`);
console.log(`Orphaned chunks: ${health.orphanedChunks}`);
```

## Search

### Basic Search
```typescript
const results = await rag.searcher.search('user authentication', {
    limit: 10,
});
```

### Search with Cache
```typescript
// Cache results for 5 minutes
const results = await rag.searcher.searchWithCache(
    'user authentication',
    { limit: 10 },
    5 * 60 * 1000  // TTL in ms
);
```

### Faceted Search (with filters)
```typescript
const results = await rag.searcher.search('validation', {
    limit: 10,
    filters: {
        extensions: ['.ts', '.tsx'],
        folders: ['src/controllers/'],
        modifiedAfter: '2024-01-01',
        type: ['function', 'method'],
    },
});
```

### BM25 Search
```typescript
const results = await rag.searcher.search('database query', {
    useBM25: true,
    limit: 15,
});
```

### Hybrid Search (Keyword + TF-IDF)
```typescript
const results = await rag.searcher.searchHybrid('error handling', {
    limit: 10,
    keywordWeight: 0.5,
    tfidfWeight: 0.5,
});
```

## Suggestions / Autocomplete

```typescript
// Get suggestions as user types
const suggestions = await rag.searcher.getSuggestions('auth', { limit: 5 });
// [{ text: 'authenticateUser', type: 'function', filePath: 'src/auth.ts', score: 50 }]

// Get all function suggestions
const functions = rag.searcher.getSuggestionsByType('function', 10);

// Get all class suggestions
const classes = rag.searcher.getSuggestionsByType('class', 10);
```

## Relevance Feedback

```typescript
// Record when user clicks a result
rag.searcher.reportClick('user auth', 'src/auth.ts');

// Query expansion based on learned relevance
const expanded = rag.searcher.expandQuery('auth');
// ['auth', 'authenticate', 'authentication', 'authorize']
```

## File Watching (Auto-reindex)

```typescript
import { createWatchManager } from '@a2a/rag';

const watcher = createWatchManager(rag.indexer, {
    debounceMs: 1000,
    onChange: (file) => console.log(`Changed: ${file}`),
    onIndexed: (file) => console.log(`Reindexed: ${file}`),
});

await watcher.watch('/path/to/project');

// Later: stop watching
watcher.stop();
```

## Protocol Format Search

```typescript
const result = await rag.searcher.searchWithProtocol('query', {
    maxFiles: 5,
    allowedDirs: ['src/'],
    allowedExtensions: ['.ts'],
    snippetConfig: { maxLines: 10 },
});

// Returns: { found: true, files: [...], snippetCount: 5 }
```

## Advanced Configuration

```typescript
const rag = createRAG({
    projectPath: '/project',
    
    // Chunking options
    useAST: true,           // Use AST parsing for JS/TS/PHP
    fallbackToRegex: true,  // Fallback if AST fails
    
    // Search options
    useBM25: true,
    useTFIDF: true,
    
    // Caching
    queryCacheTTL: 5 * 60 * 1000,  // 5 minutes
    
    // Relevance learning
    relevanceFeedback: true,
    
    // File patterns
    includePatterns: ['**/*.ts'],
    excludePatterns: ['**/*.test.ts'],
});
```

## Query Understanding

```typescript
// Analyze query intent
const intent = rag.searcher.analyzeQuery('find UserController methods');
console.log(intent.type);        // 'symbol'
console.log(intent.confidence);  // 0.85
console.log(intent.entities);    // { symbols: ['UserController'], fileTypes: [] }
```
