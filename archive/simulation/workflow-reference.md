# Workflow Reference: Анализ другой системы (Cursor)

> **Источник**: `domain-platform/markdown-pipeline-automator/documentaion/cursor-answers/workflow/`
> 
> **Дата анализа**: 2026-02-23

---

## 1. Управление контекстом

### 1.1 Ключевое уточнение

⚠️ **Cursor НЕ управляет контекстом явно** — это делает система. У модели нет:
- Token budgets
- Programmable eviction
- Relevance scoring
- Prefetching/caching

Но документ содержит **референсный дизайн для A2A**.

### 1.2 Типы контекста (10 типов с приоритетами)

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

### 1.3 Стратегии eviction (5 стратегий)

| Strategy | Use case |
|----------|----------|
| **LRU** | Related files, style snippets – evict least recently accessed |
| **Priority-based** | Task > active file > related > structure |
| **Size-based** | Large files: keep only ±50 lines around edit location |
| **Relevance-based** | After task change: evict files no longer relevant |
| **Task-bound** | Errors, test results: drop when subtask is done |

### 1.4 Методы сжатия контекста

| Method | When |
|--------|------|
| **Summarization** | Large files: short summary + line ranges for relevant parts |
| **Chunking** | Only load the region around the edit location |
| **Symbolic refs** | `file:path:lines` instead of full content |
| **Embedding** | Not used for context; only for retrieval (RAG) |

**Когда сжимать**: когда single-item size > ~1500 tokens или при приближении к window limit.

### 1.5 Progressive Loading (4 фазы)

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

### 1.6 Формула Relevance Scoring

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

### 1.7 Refresh Triggers

| Trigger | Action |
|---------|--------|
| New user message | Reparse task, update relevance |
| File switch | Evict old active file or reduce to summary |
| Edit applied | Refresh active file content |
| Error | Load error + surrounding code; raise error priority |
| Test run | Load test output; evict after fix attempt |
| Task change | Re-score all items; evict low relevance |

### 1.8 Best Practices (8 правил)

1. **Task first** – keep task short and stable; avoid redundancy
2. **Region over full file** – load ±30–50 lines around the edit region
3. **Evict by relevance** – use a score and evict low scores first
4. **Compress before evicting** – summarize large blocks before dropping
5. **Limit related files** – 3–5 most relevant; use symbolic refs for the rest
6. **Bump error context** – temporarily raise priority of error + surrounding code
7. **Avoid duplicate info** – one canonical representation per concept
8. **Monitor utilization** – reserve 10–15% of the window for next actions

---

## 2. Фазы работы (Workflow Phases)

### 2.1 Phase 1: Task Reception

**Что фиксируется:**
- Core intent (what to change/add/fix)
- Explicit constraints (tech stack, files, formats)
- Ambiguities → short clarification list

**Контекст на этом этапе:**
- Minimal: message + workspace path
- Files не читаются пока не нужно
- @ mentions если есть в сообщении

**Selection logic:**
- Extract: target (e.g. "registration form"), action (e.g. "add validation"), object (e.g. "email")
- Keep terms: file names, component names, stack terms
- Use for later search

### 2.2 Phase 2: Index / Codebase Analysis

**Инструменты:**
- `codebase_search` – semantic search (по смыслу)
- `grep` – exact symbols, strings
- `glob_file_search` – find files by path/name

**Выбор файлов:**
1. Explicit targets (e.g. `@src/RegisterForm.tsx`)
2. Semantic query: e.g. "registration form", "email validation"
3. Exact matches: e.g. `RegisterForm`, `register`, `email`
4. Dependencies: imports of the target file, files that import it

**Relevance criteria:**
- Semantic match to the task
- Same module / directory as target
- Existence of similar patterns elsewhere

### 2.3 Phase 3: File and Style Context

**Style context включает:**
- Naming (PascalCase, camelCase, file naming)
- Patterns (similar validators, error handling)
- Import style (order, aliases)
- Comment style (JSDoc, inline, none)
- Structure (layout of similar components)

**Источники (по приоритету):**
1. Current file – primary
2. Sibling or related files
3. Configs (ESLint, Prettier, tsconfig) if needed
4. Project root (README, configs)

### 2.4 Progressive Disclosure

**Принцип: Start broad, then narrow:**
1. High-level location (e.g. "registration form in frontend")
2. Specific file
3. Specific function/component
4. Exact place for change

**Поиск поэтапно:**
- Сначала "registration form"
- Потом "email validation"
- Не загружает весь codebase, только нужное на каждом шаге

### 2.5 Iteration & Error Recovery

**Типичный flow:**
```
Search → Read → Edit → Check linter → Retry if needed
```

**Triggers для следующей итерации:**
- Linter errors
- Missing imports or references
- User feedback
- Unexpected structure or APIs

---

## 3. Применение к A2A

### 3.1 Что есть у A2A, чего нет у Cursor

| Aspect | Cursor | A2A |
|--------|--------|-----|
| Phase state machine | ❌ Implicit | ✅ Можно сделать explicit |
| Persistent memory | ❌ No | ✅ Graph + sessions |
| Dependency graph | ❌ Inferred | ✅ Explicit (entities/relations) |
| Context prioritization | ❌ Fixed | ✅ Configurable |
| Error recovery | ❌ Ad-hoc | ✅ Structured (neurons) |
| Rollback | ❌ Manual | ✅ Можно automatic |

### 3.2 Рекомендации для A2A

#### Context Manager Module

```javascript
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
  
  add(type, content, metadata = {}) { /* ... */ }
  evict(needed) { /* ... */ }
  calculateRelevance(ctx) { /* ... */ }
}
```

#### Phase State Machine

```javascript
const phases = {
  RECEPTION: { next: 'ANALYSIS', context: 'minimal' },
  ANALYSIS: { next: 'EDITING', context: 'expanded' },
  EDITING: { next: 'VALIDATION', context: 'focused' },
  VALIDATION: { next: 'DONE', context: 'result' }
};
```

#### Search Tools Integration

```javascript
class SearchOrchestrator {
  async search(query, type) {
    switch(type) {
      case 'semantic': return await this.codebaseSearch(query);
      case 'exact': return await this.grep(query);
      case 'glob': return await this.globFileSearch(query);
    }
  }
}
```

#### Style Context Extractor

```javascript
class StyleContextExtractor {
  extract(file) {
    return {
      naming: this.extractNaming(file),
      patterns: this.extractPatterns(file),
      imports: this.extractImportStyle(file),
      comments: this.extractCommentStyle(file)
    };
  }
}
```

### 3.3 Интеграция с существующим A2A

#### Для Recon Indexer:
- Использовать **semantic search** для "interesting files"
- Применять **progressive disclosure** (broad → narrow → exact)
- Извлекать **style context** для понимания паттернов

#### Для Context Detector:
- **Phase 1**: Detect project type (Laravel, Vue, etc.)
- **Phase 2**: Search for key files (routes, models, controllers)
- **Phase 3**: Extract patterns and activate actions

#### Для Graph:
- Хранить **context priorities** как metadata на relations
- Использовать **relevance scoring** для weight на edges
- Добавить **eviction timestamps** для устаревших nodes

---

## 4. Ключевые инсайты

### 4.1 Контекст — это не просто "память"

Контекст имеет:
- **Приоритеты** (task > active file > related > structure)
- **Retention policies** (permanent, session, current-task, until-fixed)
- **Eviction strategies** (LRU, priority-based, size-based, relevance-based)
- **Compression methods** (summarization, chunking, symbolic refs)

### 4.2 Progressive Disclosure — ключ к масштабируемости

Не загружать весь codebase, а:
1. Начать с broad search
2. Сузить до specific files
3. Сфокусироваться на exact locations
4. Загрузить style context по необходимости

### 4.3 Style Context извлекается из кода

Не нужно хранить style guide отдельно — он извлекается из:
- Current file (primary)
- Sibling files
- Configs
- Project root

### 4.4 Relevance Scoring — формула для приоритизации

Комбинация:
- Keyword overlap (15 pts)
- Semantic similarity (10 pts)
- Active file bonus (20 pts)
- Direct import (12 pts)
- Same directory (5 pts)
- Recency decay (8 pts)
- Explicit mention (25 pts)

### 4.5 Refresh Triggers — когда обновлять контекст

- New message → reparse task
- File switch → evict old
- Edit → refresh content
- Error → bump priority
- Test → load output
- Task change → re-score all

---

## 5. Открытые вопросы

- ❓ Как `codebase_search` работает под капотом? (embeddings? LSP?)
- ❓ Как определяется "semantic match"? (threshold? scoring?)
- ❓ Как обрабатываются conflicting styles в разных файлах?
- ❓ Как долго держится context window? (tokens? turns?)
- ❓ Есть ли fallback если semantic search не находит?

---

## 6. Следующие шаги для A2A

1. ✅ Проанализировать workflow reference
2. ⏳ Реализовать Context Manager с приоритетами
3. ⏳ Добавить Phase State Machine
4. ⏳ Интегрировать search tools (semantic + exact + glob)
5. ⏳ Реализовать Style Context Extractor
6. ⏳ Добавить Progressive Disclosure в orchestrator
7. ⏳ Реализовать Relevance Scoring для graph
8. ⏳ Добавить Refresh Triggers
9. ⏳ Тестировать на реальных задачах
