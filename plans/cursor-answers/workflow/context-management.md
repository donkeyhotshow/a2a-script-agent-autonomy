# Context Management - Ответ от Cursor

> **Статус**: ✅ Получен
> 
> **Вопрос**: `.amazonq/questions-to-cursor/CONTEXT-MANAGEMENT.md`
> 
> **Дата**: 2024-01-XX

---

## Ответ

### 1. Clarification

Context is controlled by the system, not by the model. Cursor truncates the conversation and decides what is sent each turn. I don't have:

- Token budgets
- Programmable eviction
- Relevance scoring
- Prefetching or caching

Below: what happens in practice, plus a proposed design for your A2A system.

---

### 2. Table: Context types (proposed for A2A)

| contextType | priority | avgTokens | retention | evictionStrategy |
|-------------|----------|-----------|-----------|------------------|
| task-description | 1 | 150 | permanent | never |
| active-file | 2 | 2000 | current-task | on-file-switch |
| related-files | 3 | 400 | session | LRU, size cap |
| project-structure | 4 | 250 | session | on-demand refresh |
| dependencies | 3 | 300 | current-task | on-import-change |
| style-context | 3 | 500 | session | LRU |
| domain-knowledge | 4 | 200 | session | on-demand |
| conversation-history | 2 | 500 | sliding | recency-based |
| error-messages | 1 | 100 | until-fixed | after fix |
| test-results | 3 | 150 | current-task | after next action |

---

### 3. Eviction strategies

| Strategy | Use case |
|----------|----------|
| **LRU** | Related files, style snippets – evict least recently accessed |
| **Priority-based** | Task > active file > related > structure |
| **Size-based** | Large files: keep only focused region (e.g. ±50 lines) |
| **Relevance-based** | After task change: evict files no longer relevant |
| **Task-bound** | Errors, test results: drop when subtask is done |

---

### 4. Context compression

| Method | When |
|--------|------|
| **Summarization** | Large files: short summary + line ranges for relevant parts |
| **Chunking** | Only load the region around the edit location |
| **Symbolic refs** | `file:path:lines` instead of full content for rarely used files |
| **Embedding** | Not used for context; only for retrieval if you add RAG |

When to compress: when single-item size > ~1500 tokens or when approaching the window limit.

---

### 5. Progressive loading (example)

```
Phase 1: Task (≈300 tokens)
  - task description: 150
  - project type / stack: 100
  - explicit constraints: 50

Phase 2: Discovery (≈600 tokens)
  - file list: 250
  - entry points: 150
  - search results: 200

Phase 3: Code analysis (≈2500 tokens)
  - active file (full or region): 2000
  - imports / direct deps: 500

Phase 4: Style / validation (≈800 tokens)
  - similar code samples: 500
  - config (lint/format): 200
  - validation patterns: 100
```

---

### 6. Relevance scoring (example formula)

```javascript
function relevanceScore(item, task, state) {
  let s = 0;
  
  // Task relevance (semantic + keyword)
  s += keywordOverlap(item, task) * 15;      // 0–15
  s += semanticSimilarity(item, task) * 10;  // 0–10 (if embeddings)
  
  // Structure
  s += isActiveFile(item) * 20;              // 0 or 20
  s += isDirectImport(item, activeFile) * 12; // 0 or 12
  s += sameDirectory(item, activeFile) * 5;  // 0 or 5
  
  // Recency
  s += recencyScore(item.lastAccess) * 8;    // 0–8 (decay)
  
  // Task binding
  s += isExplicitlyMentioned(item, task) * 25; // 0 or 25
  
  return s; // max ~95
}
```

Evict lowest scores first when the context is full.

---

### 7. Step-by-step example (4000-token window)

**Iteration 1: Understanding**

```
Used: ~300
- Task: 50
- Project: Laravel + Vue (detected from package.json / structure): 100
- Available: 3700

Next: semantic search for "registration form" → load file list / paths (≈250)
```

**Iteration 2: File discovery**

```
Used: ~600
- Task: 50
- Project: 100
- File list: 200
- Search results: 250
- Available: 3400

Next: read Registration.vue (full file or first chunk)
```

**Iteration 3: Analysis**

```
Used: ~3100
- Task: 50
- Registration.vue: 2500
- Validation patterns from sibling: 400
- Available: 900

Evict: file list, broad search results (replace with concrete paths)
Keep: task, active file, validation samples
```

**Iteration 4: Edit and verification**

```
Used: ~3600
- Task: 50
- Registration.vue (modified): 2600
- Validation rules (extracted): 300
- Linter config: 150
- Available: 400

Evict: older validation samples if redundant
Keep: task, modified file, rules, config
Use 400 for: error message or quick grep if needed
```

---

### 8. Refresh triggers

| Trigger | Action |
|---------|--------|
| New user message | Reparse task, update relevance |
| File switch | Evict old active file or reduce to summary |
| Edit applied | Refresh active file content |
| Error | Load error + surrounding code; raise error priority |
| Test run | Load test output; evict after fix attempt |
| Task change | Re-score all items; evict low relevance |

---

### 9. Context sharing between iterations

For A2A:

- **Persistent**: task description, project type
- **Summary**: "Used RegisterForm.vue, pattern from PasswordField.vue"
- **Refs**: `Registration.vue:L45-L80` instead of full file
- **Embeddings**: only if you add a retrieval layer (e.g. for related files)

---

### 10. Prefetching (for A2A)

Prefetch when you have high confidence:

- Files imported by the active file
- Files in the same directory and of the same type
- Config files (ESLint, Prettier) once project type is known

Avoid prefetching large or rarely used files.

---

### 11. Caching (for A2A)

| Cache | TTL | Invalidation |
|-------|-----|--------------|
| Project structure | 1 session | File create/delete |
| File content | Until edit | File change |
| AST | Until edit | File change |
| Style patterns | Session | Major refactor |
| Embeddings | Session / LRU | Config or structure change |

---

### 12. Best practices

1. **Task first** – keep task short and stable; avoid redundancy.
2. **Region over full file** – load ±30–50 lines around the edit region when possible.
3. **Evict by relevance** – use a score and evict low scores first.
4. **Compress before evicting** – summarize large blocks before dropping.
5. **Limit related files** – 3–5 most relevant; use symbolic refs for the rest.
6. **Bump error context** – temporarily raise priority of error + surrounding code.
7. **Avoid duplicate info** – one canonical representation per concept.
8. **Monitor utilization** – reserve 10–15% of the window for next actions.

---

**Summary:** Current Cursor behavior is mostly implicit. The table, scoring, progressive loading, and eviction/compression rules above are a concrete design you can use for your A2A system's context manager.

---

## Ключевые выводы

### Важное уточнение:
- ⚠️ **Cursor НЕ управляет контекстом** - это делает система
- ⚠️ Нет token budgets, eviction, scoring, prefetching, caching
- ✅ Но дал **референсный дизайн для A2A**

### 10 типов контекста (с приоритетами):

| Priority | Type | Tokens | Retention | Eviction |
|----------|------|--------|-----------|----------|
| 1 | task-description | 150 | permanent | never |
| 1 | error-messages | 100 | until-fixed | after fix |
| 2 | active-file | 2000 | current-task | on-file-switch |
| 2 | conversation-history | 500 | sliding | recency-based |
| 3 | related-files | 400 | session | LRU, size cap |
| 3 | dependencies | 300 | current-task | on-import-change |
| 3 | style-context | 500 | session | LRU |
| 3 | test-results | 150 | current-task | after next action |
| 4 | project-structure | 250 | session | on-demand refresh |
| 4 | domain-knowledge | 200 | session | on-demand |

### 5 стратегий eviction:
1. **LRU** - для related files, style snippets
2. **Priority-based** - task > active > related > structure
3. **Size-based** - большие файлы: только ±50 lines
4. **Relevance-based** - после смены задачи
5. **Task-bound** - errors, tests: drop после завершения

### 4 метода compression:
1. **Summarization** - summary + line ranges
2. **Chunking** - только region вокруг edit
3. **Symbolic refs** - `file:path:lines` вместо full content
4. **Embedding** - только для retrieval (RAG)

### Relevance scoring formula:
```javascript
score = keywordOverlap * 15        // 0-15
      + semanticSimilarity * 10    // 0-10
      + isActiveFile * 20           // 0 or 20
      + isDirectImport * 12         // 0 or 12
      + sameDirectory * 5           // 0 or 5
      + recencyScore * 8            // 0-8
      + isExplicitlyMentioned * 25  // 0 or 25
// max ~95
```

### Progressive loading (4 фазы):
1. **Task** (300 tokens) - description + stack + constraints
2. **Discovery** (600 tokens) - file list + entry points + search
3. **Code analysis** (2500 tokens) - active file + imports
4. **Style/validation** (800 tokens) - samples + config + patterns

### Best practices (8 правил):
1. Task first - короткий и стабильный
2. Region over full file - ±30-50 lines
3. Evict by relevance - lowest scores first
4. Compress before evicting - summarize first
5. Limit related files - 3-5 max, rest as refs
6. Bump error context - temporary priority boost
7. Avoid duplicate info - one canonical representation
8. Monitor utilization - reserve 10-15% for next actions

---

## Применение в A2A

### 1. Context Manager Module

```javascript
// terminator/modules/context-manager/
class ContextManager {
  constructor(windowSize = 4000) {
    this.windowSize = windowSize;
    this.contexts = new Map();
    this.priorities = {
      'task-description': 1,
      'error-messages': 1,
      'active-file': 2,
      'conversation-history': 2,
      'related-files': 3,
      'dependencies': 3,
      'style-context': 3,
      'test-results': 3,
      'project-structure': 4,
      'domain-knowledge': 4
    };
  }
  
  add(type, content, metadata = {}) {
    const tokens = this.estimateTokens(content);
    
    // Check if need eviction
    if (this.currentSize() + tokens > this.windowSize) {
      this.evict(tokens);
    }
    
    this.contexts.set(metadata.id || type, {
      type,
      content,
      tokens,
      priority: this.priorities[type],
      timestamp: Date.now(),
      ...metadata
    });
  }
  
  evict(needed) {
    // Score all contexts
    const scored = Array.from(this.contexts.entries())
      .map(([id, ctx]) => ({
        id,
        score: this.calculateRelevance(ctx)
      }))
      .sort((a, b) => a.score - b.score);
    
    // Evict lowest scores until enough space
    let freed = 0;
    for (const { id } of scored) {
      if (freed >= needed) break;
      const ctx = this.contexts.get(id);
      if (ctx.retention !== 'permanent') {
        freed += ctx.tokens;
        this.contexts.delete(id);
      }
    }
  }
  
  calculateRelevance(ctx) {
    let score = 0;
    
    // Priority weight
    score += (5 - ctx.priority) * 20; // 80, 60, 40, 20
    
    // Recency (decay over time)
    const age = Date.now() - ctx.timestamp;
    score += Math.max(0, 15 - age / 60000); // 0-15
    
    // Task relevance
    if (ctx.taskRelevant) score += 25;
    
    // Active file bonus
    if (ctx.type === 'active-file') score += 20;
    
    return score;
  }
}
```

### 2. Progressive Loader

```javascript
// terminator/modules/context-manager/progressive-loader.js
class ProgressiveLoader {
  async loadPhase1(task) {
    // Task (300 tokens)
    return {
      taskDescription: task.description, // 150
      projectType: await this.detectProjectType(), // 100
      constraints: task.constraints // 50
    };
  }
  
  async loadPhase2(phase1) {
    // Discovery (600 tokens)
    return {
      ...phase1,
      fileList: await this.getFileList(), // 250
      entryPoints: await this.findEntryPoints(), // 150
      searchResults: await this.search(phase1.taskDescription) // 200
    };
  }
  
  async loadPhase3(phase2, targetFile) {
    // Code analysis (2500 tokens)
    return {
      task: phase2.taskDescription, // 150
      activeFile: await this.readFile(targetFile), // 2000
      imports: await this.getImports(targetFile) // 500
    };
  }
  
  async loadPhase4(phase3) {
    // Style/validation (800 tokens)
    return {
      ...phase3,
      styleSamples: await this.getStyleSamples(), // 500
      config: await this.getConfig(), // 200
      validationPatterns: await this.getPatterns() // 100
    };
  }
}
```

### 3. Context Compressor

```javascript
// terminator/modules/context-manager/compressor.js
class ContextCompressor {
  compress(content, type) {
    if (this.estimateTokens(content) < 1500) {
      return content; // No compression needed
    }
    
    switch(type) {
      case 'active-file':
        return this.chunkFile(content);
      case 'related-files':
        return this.summarizeFile(content);
      case 'project-structure':
        return this.symbolicRefs(content);
      default:
        return content;
    }
  }
  
  chunkFile(content, editLine, context = 50) {
    // Keep only ±50 lines around edit location
    const lines = content.split('\n');
    const start = Math.max(0, editLine - context);
    const end = Math.min(lines.length, editLine + context);
    
    return {
      type: 'chunk',
      lines: `${start}-${end}`,
      content: lines.slice(start, end).join('\n')
    };
  }
  
  summarizeFile(content) {
    // Extract: imports, exports, function signatures
    return {
      type: 'summary',
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      functions: this.extractSignatures(content)
    };
  }
  
  symbolicRefs(content) {
    // Just file paths and line ranges
    return {
      type: 'symbolic',
      refs: content.map(f => `${f.path}:${f.startLine}-${f.endLine}`)
    };
  }
}
```

### 4. Refresh Manager

```javascript
// terminator/modules/context-manager/refresh-manager.js
class RefreshManager {
  constructor(contextManager) {
    this.cm = contextManager;
    this.triggers = {
      'new-message': () => this.refreshTask(),
      'file-switch': (file) => this.refreshActiveFile(file),
      'edit-applied': (file) => this.refreshFileContent(file),
      'error': (error) => this.raiseErrorPriority(error),
      'test-run': (results) => this.loadTestResults(results),
      'task-change': () => this.rescoreAll()
    };
  }
  
  trigger(event, data) {
    const handler = this.triggers[event];
    if (handler) handler(data);
  }
  
  refreshActiveFile(newFile) {
    // Evict old active file or reduce to summary
    const oldActive = this.cm.getByType('active-file');
    if (oldActive) {
      this.cm.compress(oldActive.id, 'summary');
    }
    
    // Load new active file
    this.cm.add('active-file', newFile);
  }
  
  raiseErrorPriority(error) {
    // Temporarily boost error context priority
    this.cm.add('error-messages', error, {
      priority: 1,
      retention: 'until-fixed'
    });
  }
}
```

---

## Отличия от Cursor

| Aspect | Cursor | A2A (нужно реализовать) |
|--------|--------|-------------------------|
| Token budget | ❌ System-controlled | ✅ Explicit (4000-8000) |
| Eviction | ❌ Implicit | ✅ Explicit (LRU, priority, relevance) |
| Scoring | ❌ No | ✅ Formula-based |
| Compression | ❌ No | ✅ Summarization, chunking, symbolic refs |
| Prefetching | ❌ No | ✅ Imports, same-dir files, configs |
| Caching | ❌ No | ✅ Project structure, AST, embeddings |
| Progressive loading | ✅ Implicit | ✅ Explicit (4 phases) |
| Refresh triggers | ✅ Implicit | ✅ Explicit (6 triggers) |

---

## Вопросы для уточнения

- ❓ Какой реальный размер context window у Cursor? (4K? 8K? 16K?)
- ❓ Как система определяет что truncate из conversation?
- ❓ Есть ли разница между chat и composer modes?
- ❓ Как обрабатываются очень большие файлы (10K+ lines)?
- ❓ Используются ли embeddings для context retrieval?

---

## Следующие шаги

1. ✅ Понять context management подход
2. ⏳ Реализовать ContextManager с priorities
3. ⏳ Реализовать ProgressiveLoader (4 phases)
4. ⏳ Реализовать ContextCompressor (3 methods)
5. ⏳ Реализовать RefreshManager (6 triggers)
6. ⏳ Добавить relevance scoring formula
7. ⏳ Реализовать eviction strategies (5 types)
8. ⏳ Добавить caching layer
9. ⏳ Тестировать на реальных задачах
10. ⏳ Оптимизировать token usage
