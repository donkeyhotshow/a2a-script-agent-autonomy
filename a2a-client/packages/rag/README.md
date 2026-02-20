# @a2a/rag

RAG (Retrieval-Augmented Generation) Indexing and Search Module for A2A. Provides local indexing and search capabilities for code projects without using LLM - all processing is done locally.

## Features

- **Local Indexing**: Index project files for fast search
- **Smart Chunking**: Different chunking strategies for PHP, JS/TS, and Markdown
- **Keyword Search**: Extract and search by keywords, technical terms, and method names
- **No LLM Required**: All processing happens locally on the client
- **Multiple File Types**: Support for PHP, JavaScript, TypeScript, Vue, Markdown, JSON, YAML

## Installation

```bash
npm install @a2a/rag
```

## Usage

### Basic Setup

```javascript
const { createRAG, RAGIndexer, RAGSearcher } = require('@a2a/rag');

// Option 1: Use createRAG helper
const { indexer, searcher, chunks } = createRAG({
  projectPath: '/path/to/project',
  includePatterns: ['**/*.php', '**/*.js', '**/*.vue'],
  excludePatterns: ['node_modules/**', 'vendor/**']
});

// Option 2: Use classes directly
const indexer = new RAGIndexer({
  projectPath: '/path/to/project',
  includePatterns: ['**/*.php', '**/*.js'],
  excludePatterns: ['node_modules/**', 'vendor/**', '.git/**']
});

const searcher = new RAGSearcher({
  projectPath: '/path/to/project'
});
```

### Indexing a Project

```javascript
// Index the entire project
const index = await indexer.indexProject();

// Force re-index (ignore existing index)
const index = await indexer.indexProject(true);

console.log(`Indexed ${index.files.length} files, ${index.chunks.length} chunks`);
```

### Searching the Index

```javascript
// Load index (automatically done on first search)
const results = await searcher.search('email validation', {
  limit: 10
});

// Process results
results.forEach(result => {
  console.log(`[Score: ${result.score}] ${result.chunk.filePath}`);
  console.log(`  Type: ${result.chunk.type}, Name: ${result.chunk.name}`);
  console.log(`  Highlights: ${result.highlights.join(', ')}`);
});
```

### Advanced Search

```javascript
// Search with options
const results = await searcher.search('authentication', {
  limit: 20
});

// Get file content
const content = await searcher.getFileContent('app/Models/User.php');

// Get chunks for specific file
const chunks = await searcher.getFileChunks('app/Models/User.php');
```

## Index Structure

The index is stored in `.a2a/index/rag-files.json`:

```json
{
  "version": "1.0",
  "timestamp": "2026-01-20T10:00:00Z",
  "projectPath": "/path/to/project",
  "files": [
    {
      "path": "app/Models/User.php",
      "ext": ".php",
      "size": 1234,
      "modified": "2026-01-20T09:00:00Z",
      "hash": "abc123def456",
      "language": "php"
    }
  ],
  "chunks": [
    {
      "id": "abc123",
      "filePath": "app/Models/User.php",
      "type": "class",
      "name": "User",
      "content": "class User extends Model {...",
      "startLine": 1
    }
  ]
}
```

## Chunk Types

| Type | Description | File Types |
|------|-------------|------------|
| `class` | Class definition | PHP, JS, TS |
| `method` | Method/function | PHP, JS, TS |
| `function` | Function definition | JS, TS |
| `section` | Markdown section | MD |
| `lines` | Line-based chunk | Other |

## Configuration

### RAGIndexer Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| projectPath | string | `process.cwd()` | Path to project |
| includePatterns | string[] | `['**/*.php', '**/*.js', '**/*.vue', '**/*.ts', '**/*.md']` | File patterns to include |
| excludePatterns | string[] | `['node_modules/**', 'vendor/**', 'storage/**', '.git/**']` | File patterns to exclude |

### RAGSearcher Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| projectPath | string | `process.cwd()` | Path to project |

## Search Scoring

The search algorithm uses multiple factors for scoring:

1. **Keyword matches** (2 points each)
2. **Technical terms** (10 points each) - CamelCase, class names
3. **Method names** (15 points each) - Function calls
4. **Chunk type bonus** (1.2x) - Classes and methods get bonus
5. **Name match** (20 points) - Direct name match

## Data Request Format

When requesting data from the RAG system:

```javascript
const searchRequest = {
  query: 'email validation',
  options: {
    limit: 10,
    type: 'class'  // optional filter
  }
};
```

## Command Format for Search

Commands from server for RAG search:

```javascript
const command = {
  id: 'cmd-search-001',
  type: 'search_rag',
  params: {
    query: 'валидация email',
    options: {
      limit: 10,
      type: 'class|method|function|section|lines'
    }
  }
};
```

### Response Format

```javascript
const response = {
  commandId: 'cmd-search-001',
  success: true,
  results: [
    {
      chunk: {
        id: 'abc123',
        filePath: 'app/Models/User.php',
        type: 'class',
        name: 'User',
        content: 'class User extends Model {...',
        startLine: 1
      },
      score: 25.5,
      highlights: [
        '...валидация для email...',
        '...protected $rules = [\'email\' => \'email\'...'
      ]
    }
  ]
};
```

## API Reference

### createRAG(config)

Creates a RAG instance with indexer, searcher, and chunk manager.

```javascript
const { indexer, searcher, chunks } = createRAG({
  projectPath: '/project',
  includePatterns: ['**/*.php'],
  excludePatterns: ['vendor/**']
});
```

### RAGIndexer

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| indexProject(force) | boolean | Promise<Object> | Index all project files |
| indexFile(filePath) | string | Promise<Object> | Index single file |
| chunkFile(filePath, content, ext) | string, string, string | Array | Chunk file content |

### RAGSearcher

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| search(query, options) | string, Object | Promise<Array> | Search index |
| searchFiles(pattern) | string | Promise<Array> | Search files by pattern |
| getFileContent(path) | string | Promise<string> | Get file content |
| getFileChunks(path) | string | Promise<Array> | Get chunks for file |
| loadIndex() | - | Promise<Object> | Load index into memory |

### ChunkManager

```javascript
const { ChunkManager } = require('@a2a/rag');

const manager = new ChunkManager(config);

// Chunk PHP by class/method
const phpChunks = manager.chunkPHP(filePath, content);

// Chunk JS/TS by function/class
const jsChunks = manager.chunkJS(filePath, content);

// Chunk Markdown by sections
const mdChunks = manager.chunkMarkdown(filePath, content);

// Simple line-based chunking
const lineChunks = manager.chunkLines(filePath, content, 50);
```

## Examples

### Example 1: Index and Search Laravel Project

```javascript
const { createRAG } = require('@a2a/rag');

async function indexAndSearch() {
  const { indexer, searcher } = createRAG({
    projectPath: './my-laravel-app',
    includePatterns: ['**/*.php', '**/*.vue'],
    excludePatterns: ['vendor/**', 'node_modules/**', 'storage/**']
  });

  // Index project
  console.log('Indexing...');
  await indexer.indexProject();

  // Search
  const results = await searcher.search('authentication middleware', {
    limit: 5
  });

  results.forEach(r => {
    console.log(`${r.chunk.filePath} (${r.chunk.type}: ${r.chunk.name})`);
    console.log(`  Score: ${r.score}`);
    console.log(`  ${r.highlights[0] || r.chunk.content.substring(0, 100)}...`);
  });
}

indexAndSearch().catch(console.error);
```

### Example 2: Direct File Search

```javascript
const { RAGSearcher } = require('@a2a/rag');

async function findControllers() {
  const searcher = new RAGSearcher({
    projectPath: './my-app'
  });

  // Search for controller files
  const controllers = await searcher.searchFiles('**/*Controller.php');
  
  console.log(`Found ${controllers.length} controllers:`);
  controllers.forEach(c => console.log(`  - ${c.path}`));
}

findControllers().catch(console.error);
```

## Performance Tips

1. **Index regularly**: Run `indexProject()` after significant code changes
2. **Use limits**: Always specify `limit` for large projects
3. **Cache index**: RAGSearcher caches the index in memory after first load
4. **Exclude large directories**: Always exclude `node_modules`, `vendor`, etc.

## License

MIT
