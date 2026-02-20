# @a2a/hybrid-search

Fulltext-only search wrapper. RAG/Graph archived.

## Usage

```javascript
const { createHybridSearch } = require('@a2a/hybrid-search');

const hybrid = createHybridSearch({ projectPath: '/path/to/project' });

const results = await hybrid.search('ProductController', { limit: 10 });

console.log(`Strategy: ${results.strategy}`); // fulltext
results.items.forEach(r => {
  console.log(`[${r.combinedScore.toFixed(2)}] ${r.chunk.filePath}`);
});
```

## API

- `search(query, options)` — fulltext search with query-length boost
- `compareStrategies(query, options)` — returns fulltext stats
- `getStats()` — index statistics
- `getAvailableMethods()` — `['fulltext']`

## Config

| Option | Default |
|--------|---------|
| `projectPath` | `process.cwd()` |

## License

MIT
