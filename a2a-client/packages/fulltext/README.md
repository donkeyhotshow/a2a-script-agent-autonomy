# @a2a/fulltext

Full-Text Search with BM25 ranking for A2A codebase indexing.

## Features

- **Fast Search**: Very fast full-text search using FlexSearch (5-25ms)
- **Query-length boost**: More text = more points per % (unified free-style scoring)
- **Fuzzy Search**: Find results even with typos
- **BM25 Ranking**: Advanced ranking algorithm for better relevance
- **Highlight Extraction**: Automatic highlighting of matching text
- **Multiple File Types**: Support for PHP, JavaScript, TypeScript, Vue, Markdown
- **Regex Search**: Search using regular expressions

## Installation

```bash
npm install @a2a/fulltext
```

## Usage

### Basic Setup

```javascript
const { createFullText } = require('@a2a/fulltext');

const fulltext = createFullText({
  projectPath: '/path/to/project',
  tokenize: 'forward',
  resolution: 9,
  cache: true
});
```

### Indexing a Project

```javascript
// Index the entire project
const indexInfo = await fulltext.index();

console.log(`Indexed ${indexInfo.metadata.totalFiles} files`);
console.log(`Created ${indexInfo.metadata.totalDocuments} documents`);
```

### Searching

```javascript
// Simple search
const results = await fulltext.search('ProductController', {
  limit: 10
});

// Process results
results.forEach(r => {
  console.log(`[${r.score.toFixed(2)}] ${r.chunk.filePath}`);
  console.log(`  Type: ${r.chunk.type}, Name: ${r.chunk.name}`);
  console.log(`  Line: ${r.chunk.startLine}`);
  console.log(`  Highlights: ${r.highlights.join(', ')}`);
});
```

### Advanced Search Options

```javascript
// Search with fuzzy matching
const fuzzyResults = await fulltext.search('Prodct Controler', {
  limit: 10,
  fuzzy: 0.2  // Fuzzy threshold (0-1)
});

// Search with boost factors
const boostedResults = await fulltext.search('validation', {
  limit: 10,
  boost: {
    className: 2.0,    // Classes are 2x more important
    methodName: 1.5,   // Methods are 1.5x more important
    content: 1.0       // Regular content
  }
});

// Search with filters
const filteredResults = await fulltext.search('controller', {
  limit: 10,
  filter: {
    type: 'class',                    // Only classes
    filePattern: '**/*Controller.php' // Only controller files
  }
});
```

### Search with Suggestions

```javascript
// Get suggestions for misspelled queries
const { results, suggestions } = await fulltext.searchWithSuggestions('validetion', {
  limit: 10
});

if (suggestions.length > 0) {
  console.log('Did you mean:');
  suggestions.forEach(s => {
    console.log(`  ${s.original} -> ${s.suggestions.join(', ')}`);
  });
}
```

### Regex Search

```javascript
// Search using regular expressions
const regexResults = await fulltext.searchRegex('class\\s+\\w+Controller', {
  limit: 10
});

regexResults.forEach(r => {
  console.log(`Found ${r.matches.length} matches in ${r.chunk.filePath}`);
});
```

### Getting File Content

```javascript
// Get content of a specific file
const content = await fulltext.searcher.getFileContent('app/Models/User.php');

// Get all chunks for a file
const chunks = await fulltext.searcher.getFileChunks('app/Models/User.php');
```

### Statistics

```javascript
const stats = await fulltext.getStats();

console.log(`Total documents: ${stats.totalDocuments}`);
console.log(`Total files: ${stats.totalFiles}`);
console.log('Document types:', stats.types);
```

## Configuration Options

### FullTextIndexer

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectPath` | string | `process.cwd()` | Path to project |
| `tokenize` | string | `'forward'` | Tokenization strategy |
| `resolution` | number | `9` | Index resolution (higher = more precise) |
| `depth` | number | `3` | Index depth |
| `cache` | boolean | `true` | Enable caching |
| `threshold` | number | `0.6` | Search threshold |
| `includePatterns` | string[] | `['**/*.php', '**/*.js', ...]` | File patterns to include |
| `excludePatterns` | string[] | `['node_modules/**', ...]` | File patterns to exclude |

### FullTextSearcher

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectPath` | string | `process.cwd()` | Path to project |

### Search Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | number | `10` | Maximum number of results |
| `fuzzy` | number | `0` | Fuzzy search threshold (0-1) |
| `boost` | object | `{}` | Boost factors for fields |
| `filter` | object | `{}` | Filters to apply |

## Index Structure

The index is stored in `.a2a/index/fulltext-index.json`:

```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "2026-02-19T10:00:00Z",
    "projectPath": "/path/to/project",
    "totalFiles": 150,
    "totalDocuments": 1200
  },
  "index": "...",
  "documents": [
    ["file.php:1", { "filePath": "file.php", "type": "class", ... }]
  ]
}
```

## Document Types

| Type | Description | File Types |
|------|-------------|------------|
| `class` | Class definition | PHP, JS, TS |
| `function` | Function definition | PHP, JS, TS |
| `script` | Script section | Vue |
| `template` | Template section | Vue |
| `section` | Markdown section | MD |
| `lines` | Line-based chunk | Other |

## Performance

| Metric | Value |
|--------|-------|
| Indexing speed | ~100 files/second |
| Search speed | 5-25ms |
| Memory usage | Low (~50MB for 1000 files) |
| Index size | ~1MB per 100 files |

## Comparison with Other Methods

| Method | Speed | Accuracy | Fuzzy | Semantic |
|--------|-------|----------|-------|----------|
| **Full-Text** | ⚡⚡⚡⚡ 10ms | ⭐⭐⭐ 75% | ✅ | ❌ |
| RAG | ⚡⚡⚡ 50ms | ⭐⭐ 60% | ❌ | ❌ |
| Semantic | ⚡⚡ 100ms | ⭐⭐⭐⭐ 85% | ✅ | ✅ |
| Hybrid | ⚡⚡ 80ms | ⭐⭐⭐⭐⭐ 90% | ✅ | ✅ |

## Examples

### Example 1: Quick Search

```javascript
const { createFullText } = require('@a2a/fulltext');

async function quickSearch() {
  const fulltext = createFullText({ projectPath: './my-project' });
  
  // Index (only first time)
  await fulltext.index();
  
  // Search
  const results = await fulltext.search('authentication', { limit: 5 });
  
  results.forEach(r => {
    console.log(`${r.chunk.filePath}:${r.chunk.startLine}`);
    console.log(`  Score: ${r.score}`);
  });
}

quickSearch().catch(console.error);
```

### Example 2: Search with Filters

```javascript
const { FullTextSearcher } = require('@a2a/fulltext');

async function searchControllers() {
  const searcher = new FullTextSearcher({ projectPath: './my-project' });
  
  const results = await searcher.search('Product', {
    limit: 10,
    filter: {
      type: 'class',
      filePattern: '**/*Controller.php'
    }
  });
  
  console.log(`Found ${results.length} controllers`);
}

searchControllers().catch(console.error);
```

## License

MIT
