# @a2a/rag

RAG (Retrieval-Augmented Generation) indexing and search module for A2A. Provides local indexing and search capabilities for code projects.

## Installation

```bash
npm install @a2a/rag
```

## Quick Start

```typescript
import { createRAG, RAGIndexer, RAGSearcher } from '@a2a/rag';

// Create RAG instance with default configuration
const rag = createRAG({
    projectPath: '/path/to/project',
    includePatterns: ['**/*.ts', '**/*.js', '**/*.vue'],
    excludePatterns: ['node_modules/**', 'dist/**'],
});

// Index the project
await rag.indexer.indexProject();

// Search
const results = await rag.searcher.search('user authentication', { limit: 10 });
```

## Creating RAG Instance

### Basic Configuration

```typescript
import { createRAG } from '@a2a/rag';

const rag = createRAG({
    projectPath: process.cwd(),      // Project root path
    includePatterns: ['**/*.ts'],    // File patterns to include
    excludePatterns: ['dist/**'],    // File patterns to exclude
    useTFIDF: true,                  // Enable TF-IDF scoring
    useBM25: true,                   // Enable BM25 ranking
    maxDepth: 10,                    // Max directory depth
    maxFiles: 1000,                  // Max files to index
});
```

### Advanced Configuration

```typescript
import { createRAG, SemanticSearcher } from '@a2a/rag';

// With semantic search enabled
const rag = createRAG({
    projectPath: '/path/to/project',
    useSemantic: true,               // Enable semantic search
    embeddingModel: 'default',       // Embedding model to use
    embeddingProvider: 'local',    // Embedding provider
});
```

## Indexing Workflow

### Full Indexing

```typescript
const rag = createRAG({ projectPath: '/project' });

// Index entire project (incremental by default)
const index = await rag.indexer.indexProject();

console.log(`Indexed ${index.files.length} files, ${index.chunks.length} chunks`);
```

### Force Reindex

```typescript
// Force full reindex (ignore existing index)
await rag.indexer.indexProject(true);
```

### Index Status

```typescript
const status = await rag.indexer.getIndexStatus();
console.log(status);
// { hasIndex: true, fileCount: 150, timestamp: '2024-01-15T10:30:00Z' }
```

### Single File Indexing

```typescript
const result = await rag.indexer.indexFile('/path/to/file.ts');
if (result) {
    console.log(`File: ${result.file.path}`);
    console.log(`Chunks: ${result.chunks.length}`);
}
```

## Search Options

### Basic Search

```typescript
const results = await rag.searcher.search('database query', {
    limit: 10,
});

results.forEach(r => {
    console.log(`${r.chunk.filePath}: ${r.score}`);
    console.log(r.highlights);
});
```

### BM25 Search

```typescript
const results = await rag.searcher.search('authentication middleware', {
    useBM25: true,
    limit: 15,
});
```

### Hybrid Search (Keyword + TF-IDF)

```typescript
const results = await rag.searcher.searchHybrid('user service', {
    limit: 10,
    keywordWeight: 0.5,
    tfidfWeight: 0.5,
    k: 60,  // RRF constant
});
```

### Semantic Search

```typescript
// Using SemanticSearcher class
import { SemanticSearcher } from '@a2a/rag';

const semantic = new SemanticSearcher({
    projectPath: '/project',
    embedding: { model: 'default' },
});

await semantic.buildVectorIndex();
const results = await semantic.searchSimilar('handle user login', { limit: 10 });
```

### Hybrid Semantic Search

```typescript
const results = await semantic.searchHybridSemantic('error handling', {
    limit: 10,
    keywordWeight: 0.3,
    tfidfWeight: 0.3,
    semanticWeight: 0.4,
});
```

## Protocol Result Format

The RAG module supports a protocol-compatible search format for A2A integration:

```typescript
const result = await rag.searcher.searchWithProtocol('query', {
    maxFiles: 5,
    maxResults: 20,
    allowedDirs: ['src/', 'lib/'],
    allowedExtensions: ['.ts', '.js'],
    snippetConfig: {
        maxLines: 10,
        contextLines: 2,
    },
});

// Result structure:
{
    found: true,
    files: [
        {
            path: 'src/auth.ts',
            relevance: 0.95,
            snippets: [
                { content: '...', startLine: 10, endLine: 20 }
            ]
        }
    ],
    snippetCount: 5,
    policy: { maxFiles: 5, maxResults: 20 }
}
```

## Faceted Search (Filters)

```typescript
const results = await rag.searcher.search('validation', {
    limit: 10,
    filters: {
        extensions: ['.ts', '.tsx'],
        folders: ['src/controllers/', 'src/services/'],
        modifiedAfter: '2024-01-01',
        type: 'function',
    },
});
```

## Cached Search

```typescript
// Search with result caching (TTL in milliseconds)
const results = await rag.searcher.searchWithCache(
    'user authentication',
    { limit: 10 },
    5 * 60 * 1000  // 5 minute TTL
);
```

## Suggestions / Autocomplete

```typescript
// Get search suggestions
const suggestions = await rag.searcher.getSuggestions('auth', { limit: 5 });
// [{ text: 'authenticateUser', type: 'function', filePath: 'src/auth.ts', score: 50 }]

// Get by type
const functions = await rag.searcher.getSuggestionsByType('function', 10);
const classes = await rag.searcher.getSuggestionsByType('class', 10);
```

## Query Understanding

```typescript
// Analyze query intent
const intent = rag.searcher.analyzeQuery('find UserController methods');
console.log(intent.type);     // 'symbol'
console.log(intent.confidence); // 0.85
console.log(intent.entities);   // { symbols: ['UserController'], fileTypes: [] }
```

## Index Health & Diagnostics

```typescript
const health = await rag.indexer.health();
console.log(health);
// {
//     staleFiles: ['old-file.ts'],
//     orphanedChunks: 12,
//     coverage: 0.95,
//     totalFiles: 150,
//     totalChunks: 450
// }
```

## File Watcher (Auto-reindex)

```typescript
import { RAGWatchManager } from '@a2a/rag';

const watcher = new RAGWatchManager(rag.indexer);

// Watch project for changes
watcher.watch('/project', {
    debounceMs: 1000,
    onChange: (filePath) => console.log(`Reindexed: ${filePath}`),
});

// Stop watching
watcher.stop();
```

## Architecture

### Components

| Component | Purpose |
|-----------|---------|
| `RAGIndexer` | File discovery and chunking |
| `RAGSearcher` | Keyword/BM25/TF-IDF search |
| `SemanticSearcher` | Embedding-based search |
| `ChunkManager` | Code chunking (regex + AST) |
| `ASTChunker` | AST-based chunking for JS/TS/PHP |
| `QueryUnderstandingEngine` | Query intent analysis |
| `SearchSuggestionsEngine` | Autocomplete suggestions |
| `BM25Scorer` | BM25 ranking algorithm |
| `TFIDFService` | TF-IDF scoring |

### Search Strategies

1. **Keyword Search** - Fast substring matching with scoring
2. **BM25** - Probabilistic ranking (best for text)
3. **TF-IDF** - Term frequency inverse document frequency
4. **Semantic** - Embedding cosine similarity
5. **Hybrid** - Weighted combination of multiple strategies

### Chunk Types

- `class` - Class definitions
- `function` - Function declarations
- `method` - Class methods
- `interface` - TypeScript interfaces
- `type` - TypeScript type aliases
- `variable` - Variable declarations
- `section` - Markdown sections
- `vue-script` - Vue component script
- `vue-template` - Vue component template
- `vue-style` - Vue component styles
