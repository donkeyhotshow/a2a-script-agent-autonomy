# RAG Package Demo

Interactive demonstration of all 10 RAG package improvements.

## Quick Start

```bash
# Run the demo
npm run demo
```

## What It Demonstrates

### 1. Package Documentation
- README.md with full API documentation
- USAGE_EXAMPLES.md with code samples

### 2. File Watcher Integration
- Auto-reindexing on file changes
- Debounced updates (configurable)
- Status monitoring

### 3. Query Result Cache
- TTL-based caching (default 5 minutes)
- Cache statistics
- Manual cache clearing

### 4. Search Suggestions
- Autocomplete functionality
- Type-specific suggestions (function, class, method)
- Frequency-based ranking

### 5. Semantic Search Option
- Configurable via `useSemantic` flag
- Adjustable semantic weight
- Hybrid search support

### 6. Faceted Search
- Filter by file extension
- Filter by folder path
- Filter by modification date
- Filter by chunk type
- File size filtering

### 7. AST Chunker Integration
- Automatic AST parsing for JS/TS/PHP
- Fallback to regex chunking
- Language-aware chunking

### 8. Parallel Indexing
- Batch file processing (configurable batch size)
- Significant speedup for large projects
- Progress tracking

### 9. Relevance Feedback
- Click tracking to improve ranking
- Query expansion based on learned relevance
- Enable/disable feedback learning

### 10. Index Health API
- Coverage statistics
- Stale file detection
- Orphaned chunk detection
- Total files/chunks counts

## Demo Output Example

```
╔════════════════════════════════════════════════════════════╗
║     @a2a/rag Package - All Features Demo                 ║
╚════════════════════════════════════════════════════════════╝

📦 1. Creating RAG instance with all features enabled...
   ✅ RAG instance created
   ✅ AST chunking: ENABLED
   ✅ BM25 ranking: ENABLED
   ✅ Query cache: 5min TTL
   ✅ Relevance feedback: ENABLED

⚡ 2. Parallel indexing (10 files at a time)...
   ✅ Indexed 150 files
   ✅ Created 450 chunks
   ⏱️  Time: 1250ms

🏥 3. Index health check...
   📊 Coverage: 98.5%
   📁 Total files: 150
   🧩 Total chunks: 450
   🗑️  Stale files: 0
   ⚠️  Orphaned chunks: 0

💡 4. Search suggestions (autocomplete)...
   Found 5 suggestions for "ind":
   1. "index" (function) in src/indexer.ts
   2. "Indexer" (class) in src/indexer.ts
   ...

🔍 5. Faceted search with filters...
   Found 3 results in .ts files:
   1. src/searcher.ts:45 (function)
   2. src/searcher.ts:120 (method)
   ...

💾 6. Query result caching...
   First search (cache miss):
   ⏱️  Time: 45ms
   Second search (cache hit):
   ⏱️  Time: 2ms (faster!)
   📊 Cache size: 1 entries
   📊 Max TTL: 300s

🎯 7. Relevance feedback learning...
   Query "chunk" expanded to: [chunk, chunking, chunks, chunker]

👁️  8. File watcher (auto-reindexing)...
   👁️  Watching: true
   ⏳ Pending changes: 0
   🔄 Is indexing: false

🔌 9. Protocol integration service...
   ✅ Service initialized
   📁 Files indexed: 150
   🧩 Chunks created: 450
   🔍 Search results:
      Found: true
      Files: 5
      Suggestions: 5
      Expanded query: [rag, searcher, search, searching]
```
