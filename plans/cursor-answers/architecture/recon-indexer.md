# Recon Indexer - Ответ от Cursor

> **Статус**: ✅ Получен
> 
> **Вопрос**: Про механизм индексации "дикого кода" (из PRIORITY-7.md)
> 
> **Дата**: 2024-01-XX

---

## Ответ

Workspace looks empty. Answering from how Cursor behaves and how you can build a "recon" indexer.

---

### 1. Indexing (Cursor vs what you can build)

**Cursor:**
- Uses semantic + lexical search over project files
- Builds embeddings and symbol/refs from the language server
- No documented "importance" or explicit entry-point metadata

**You can add:**
- Graph over files (imports/requires)
- Entry-point heuristics (main/manifest, CLI scripts, `index.*`)
- Metadata (size, mtime, deps from lockfiles/manifests)
- Prioritize by: distance from entry, fan-out, presence of comments/TODOs

---

### 2. Structure & Intent

**Cursor:**
- Relies on LSP (symbols, refs) and LLM over retrieved chunks
- No built-in "intent" or "unfinished vs dead" classifier

**You can add:**
- Pattern rules (e.g. empty bodies, `NotImplementedError`, `// TODO`)
- Clustering by call/import graph
- Simple "stub vs used" (references count) to separate dead code from placeholders
- "Intent" = heuristics + LLM over selected snippets (comments, docstrings, TODOs, minimal surrounding code)

---

### 3. Filtering

**Cursor:**
- `.cursorignore` and common ignore patterns (e.g. `node_modules`, `build`) reduce what's indexed

**You can add:**
- Ignore lists + "interesting" score:
  - Has TODOs/FIXMEs
  - Docstrings
  - Low duplication
  - High centrality in graph
  - Changed recently
- "Ideas" = prioritize files with comments/docstrings/TODOs and optionally run a small classifier or LLM pass on those

---

### 4. Optimization

**Cursor:**
- Doesn't fully rescan every time
- Uses incremental updates and caches
- Large codebases use sampling and ranking for retrieval

**You can add:**
1. Only index/embed non-ignored files and optionally only "interesting" ones
2. Two-tier: cheap heuristics (graph + grep for TODO/FIXME) → small candidate set → optional embedding/LLM
3. Cache graph + metadata; refresh on file change
4. For 100+ files: entry points + graph centrality + "idea" score to get a ~10–30 file subset for deep analysis

---

### Recon-focused pipeline (concise)

```
1. Build file graph (imports/requires)
   ↓
2. Build entry-point list (main, index, manifest)
   ↓
3. Filter: ignore node_modules, build, cache
   ↓
4. Score "interesting":
   - TODOs/FIXMEs
   - Docstrings
   - Low in-degree (possible new code)
   - High out-degree (hubs)
   ↓
5. Stub vs dead:
   - Reference count
   - Naming (e.g. *Stub, *Placeholder)
   - Presence of TODO
   ↓
6. Optional: Embed or run LLM only on top-N by score
   ↓
7. Label "intent" or "unfinished but promising"
```

---

## Ключевые выводы

### Cursor использует:
- ✅ Semantic + lexical search
- ✅ LSP для symbols/refs
- ✅ Embeddings
- ✅ Incremental updates
- ✅ Sampling для больших проектов
- ❌ Нет explicit "importance" scoring
- ❌ Нет "intent" classification
- ❌ Нет "stub vs dead" detection

### Что добавить в Recon Indexer:

1. **File Graph**
   - Imports/requires parsing
   - Entry-point detection
   - Centrality metrics

2. **Interest Scoring**
   - TODO/FIXME count
   - Docstring presence
   - Graph metrics (in-degree, out-degree)
   - Recency (mtime)

3. **Intent Detection**
   - Pattern rules (empty bodies, NotImplementedError)
   - Stub vs dead code (reference count + naming)
   - LLM over snippets (comments, TODOs)

4. **Two-tier Optimization**
   - Tier 1: Cheap heuristics (graph + grep)
   - Tier 2: Expensive (embeddings + LLM) only on top-N

---

## Применение в PRIORITY-7

### Phase 1: File Graph Builder

```javascript
// terminator/modules/recon-indexer/graph-builder.js
class FileGraphBuilder {
  buildGraph(projectPath) {
    // 1. Scan files (ignore node_modules, build)
    const files = this.scanFiles(projectPath);
    
    // 2. Parse imports/requires
    const edges = files.map(f => this.parseImports(f));
    
    // 3. Build adjacency list
    const graph = this.buildAdjacencyList(files, edges);
    
    // 4. Calculate metrics
    graph.metrics = this.calculateMetrics(graph);
    
    return graph;
  }
  
  calculateMetrics(graph) {
    return {
      inDegree: this.calcInDegree(graph),
      outDegree: this.calcOutDegree(graph),
      centrality: this.calcCentrality(graph),
      distanceFromEntry: this.calcDistance(graph)
    };
  }
}
```

### Phase 2: Interest Scorer

```javascript
// terminator/modules/recon-indexer/interest-scorer.js
class InterestScorer {
  scoreFile(filePath, graph, content) {
    let score = 0;
    
    // TODOs/FIXMEs (+10 each)
    score += this.countMarkers(content) * 10;
    
    // Docstrings (+5)
    score += this.hasDocstrings(content) ? 5 : 0;
    
    // Low in-degree = new code (+3)
    score += graph.metrics.inDegree[filePath] < 2 ? 3 : 0;
    
    // High out-degree = hub (+5)
    score += graph.metrics.outDegree[filePath] > 5 ? 5 : 0;
    
    // Recent changes (+2)
    score += this.isRecent(filePath) ? 2 : 0;
    
    // Generated code (-5)
    score -= this.isGenerated(content) ? 5 : 0;
    
    return score;
  }
}
```

### Phase 3: Intent Detector

```javascript
// terminator/modules/recon-indexer/intent-detector.js
class IntentDetector {
  detectIntent(filePath, content, graph) {
    const intents = [];
    
    // Stub detection
    if (this.isStub(content)) {
      intents.push({ type: 'stub', confidence: 0.8 });
    }
    
    // Unfinished feature
    if (this.isUnfinished(content)) {
      intents.push({ type: 'unfinished', confidence: 0.7 });
    }
    
    // Dead code
    if (this.isDeadCode(content, graph)) {
      intents.push({ type: 'dead', confidence: 0.6 });
    }
    
    return intents;
  }
  
  isStub(content) {
    // Empty bodies, NotImplementedError, TODO
    return /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/.test(content) ||
           /NotImplementedError|throw new Error\(['"]TODO/.test(content);
  }
  
  isDeadCode(content, graph) {
    // No references + no TODO
    const refCount = graph.metrics.inDegree[filePath] || 0;
    const hasTodo = /TODO|FIXME/.test(content);
    return refCount === 0 && !hasTodo;
  }
}
```

### Phase 4: Two-tier Pipeline

```javascript
// terminator/modules/recon-indexer/pipeline.js
class ReconPipeline {
  async scan(projectPath, options = {}) {
    const { maxFiles = 30, useLLM = false } = options;
    
    // TIER 1: Cheap heuristics
    console.log('Tier 1: Building graph...');
    const graph = this.graphBuilder.buildGraph(projectPath);
    
    console.log('Tier 1: Scoring files...');
    const scored = this.scorer.scoreAllFiles(graph);
    
    // Select top-N
    const candidates = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles);
    
    console.log(`Tier 1: Selected ${candidates.length} candidates`);
    
    // TIER 2: Expensive analysis (optional)
    if (useLLM) {
      console.log('Tier 2: Intent detection...');
      const analyzed = await this.intentDetector.analyzeWithLLM(candidates);
      return { graph, candidates: analyzed };
    }
    
    return { graph, candidates };
  }
}
```

---

## Сравнение с Cursor

| Feature | Cursor | Recon Indexer |
|---------|--------|---------------|
| Semantic search | ✅ Embeddings | ✅ Optional (tier 2) |
| Lexical search | ✅ Full-text | ✅ Grep for markers |
| LSP symbols | ✅ Yes | ❌ No (use graph) |
| Entry points | ❌ No | ✅ Yes (heuristics) |
| Importance score | ❌ No | ✅ Yes (interest score) |
| Intent detection | ❌ No | ✅ Yes (patterns + LLM) |
| Stub vs dead | ❌ No | ✅ Yes (ref count + naming) |
| Incremental | ✅ Yes | ✅ Yes (cache graph) |
| Optimization | ✅ Sampling | ✅ Two-tier |

---

## Вопросы для уточнения

- ❓ Как Cursor определяет "relevant files" для контекста?
- ❓ Использует ли Cursor graph-based ranking?
- ❓ Как Cursor обрабатывает monorepos (multiple entry points)?
- ❓ Какие embeddings модели использует Cursor?
- ❓ Как часто Cursor обновляет индекс?

---

## Следующие шаги

1. ✅ Понять подход Cursor
2. ⏳ Реализовать FileGraphBuilder
3. ⏳ Реализовать InterestScorer
4. ⏳ Реализовать IntentDetector
5. ⏳ Реализовать Two-tier Pipeline
6. ⏳ Тестировать на "диком коде" из work/priority-3/
7. ⏳ Интегрировать с terminator/orchestrator.js

---

## Minimal Design для cursor-graph-indexer

### Data Structures

```javascript
// Graph
{
  nodes: ['file1.js', 'file2.js'],
  edges: [
    { from: 'file1.js', to: 'file2.js', type: 'import' }
  ],
  metrics: {
    'file1.js': { inDegree: 0, outDegree: 1, centrality: 0.5 }
  }
}

// Scored File
{
  path: 'file1.js',
  score: 15,
  reasons: ['has-todos', 'low-in-degree', 'recent'],
  intent: [{ type: 'unfinished', confidence: 0.7 }]
}
```

### One Language (JS/TS)

```javascript
// Parser for JS/TS imports
function parseImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  
  // ES6 imports
  const es6 = content.matchAll(/import .+ from ['"](.+)['"]/g);
  imports.push(...[...es6].map(m => m[1]));
  
  // CommonJS requires
  const cjs = content.matchAll(/require\(['"](.+)['"]\)/g);
  imports.push(...[...cjs].map(m => m[1]));
  
  return imports.map(i => resolveImport(i, filePath));
}
```

### Scoring + Filtering

```javascript
// Score and filter
function scoreAndFilter(graph, projectPath) {
  const files = graph.nodes;
  const scored = files.map(f => ({
    path: f,
    score: calculateScore(f, graph),
    content: fs.readFileSync(f, 'utf-8')
  }));
  
  // Filter by score > threshold
  const interesting = scored.filter(f => f.score > 5);
  
  // Sort by score
  return interesting.sort((a, b) => b.score - a.score);
}
```

Готово! Теперь есть конкретный план реализации Recon Indexer на основе подхода Cursor.
