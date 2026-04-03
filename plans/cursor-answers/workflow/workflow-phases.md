# Workflow Phases - Ответ от Cursor

> **Статус**: ✅ Получен
> 
> **Вопрос**: `.amazonq/questions-to-cursor/WORKFLOW-PHASES.md`
> 
> **Дата**: 2024-01-XX

---

## Ответ

### Phase 1: Task Reception

**What I fix:**
- Core intent (what to change/add/fix)
- Explicit constraints (tech stack, files, formats)
- Ambiguities → short clarification list

**Context at this stage:**
- Minimal: your message + workspace path
- I do not read files until needed
- I can use @ mentions if they're in the message

**Selection logic:**
- Extract: target (e.g. "registration form"), action (e.g. "add validation"), object (e.g. "email")
- Keep terms like: file names, component names, stack terms
- Use for later search

---

### Phase 2: Index / Codebase Analysis

**Tool use:**
- `codebase_search` – semantic search (by meaning)
- `grep` – exact symbols, strings
- `glob_file_search` – find files by path/name

**File choice:**
1. Explicit targets (e.g. `@src/RegisterForm.tsx`)
2. Semantic query: e.g. "registration form", "email validation"
3. Exact matches: e.g. `RegisterForm`, `register`, `email`
4. Dependencies: imports of the target file, files that import it

**Relevance criteria:**
- Semantic match to the task
- Same module / directory as target
- Existence of similar patterns elsewhere (e.g. other validators)

---

### Phase 3: File and Style Context

**What I treat as "style context":**
- Naming (PascalCase, camelCase, file naming)
- Patterns (similar validators, error handling)
- Import style (order, aliases)
- Comment style (JSDoc, inline, none)
- Structure (layout of similar components)

**Sources (by priority):**
1. Current file – primary
2. Sibling or related files
3. Configs (ESLint, Prettier, tsconfig) if needed
4. Project root (README, configs)

**How I infer style:**
- Inspect similar code nearby
- Follow existing patterns in the same file
- Read linter / formatter configs if style is unclear

---

### Context Management

**Types of context I distinguish:**
- Task: goal, constraints, ambiguities
- Code: relevant snippets
- Style: patterns, conventions
- Domain: business terms and rules (if mentioned)
- Architecture: project layout, module boundaries

**Priorities:**
1. Task context (kept until task is closed)
2. Target file content
3. Code snippets needed for edits
4. Style examples
5. Architecture when it affects the change

**Window limits:**
- No explicit control; earlier messages and tool results fade with length
- I don't "discard"; older turns are truncated by the system
- I focus on the most recent task state and the files/snippets it references

---

### Task Refinement

- Rephrase in my own words and ask to confirm if ambiguous
- Do not store history of refinements
- Can revisit earlier interpretations by re-reading the thread
- One-shot refinement: I refine once, then proceed; no separate "history layer"

---

### Iteration and Error Recovery

**Typical flow:**
1. Search
2. Read relevant files
3. Edit
4. Check linter
5. If needed: retry search → read → edit

**Triggers for another iteration:**
- Linter errors
- Missing imports or references
- User feedback
- Unexpected structure or APIs

**Rollback:**
- No internal phase rollback
- I can revert edits if the user asks or shows errors
- I re-read the task and context and try again

---

### Progressive Disclosure

- Start broad, then narrow:
  1. High-level location (e.g. "registration form in frontend")
  2. Specific file
  3. Specific function/component
  4. Exact place for change
- Search in stages: first "registration form", then "email validation", etc.
- I do not load the whole codebase; I load what each step needs

---

### Example: "Add email validation to the registration form"

**Phase 1 (reception):**
- Fix: add email validation
- Target: registration form (component/page)
- Search terms: `RegisterForm`, `register`, `email`, `validation`

**Phase 2 (analysis):**
- `codebase_search`: "registration form component"
- `grep`: `RegisterForm`, `register`
- `glob_file_search`: `*Register*.tsx`, `*register*.tsx`
- Open: form component + any existing validators

**Phase 3 (style and edits):**
- Inspect form component: structure, validation pattern
- Look at other validators (e.g. password) as templates
- Add email validation in the same style
- Check imports and error display pattern

**Context between phases:**
- Phase 1 → 2: expand with search results and file list
- Phase 2 → 3: replace broad list with content of target files and style examples
- Result: narrower, more precise context as work progresses

---

### Gaps vs Your A2A Design

1. No explicit phase state machine – flow is implicit.
2. No persistent memory – each session starts fresh.
3. No formal dependency graph – dependencies are inferred from imports and structure.
4. No configurable prioritization of context types – behavior is fixed.
5. No structured error recovery – I respond to errors as they appear.

---

**Summary:** I use progressive narrowing (task → search → files → edits), semantic + exact search for file choice, and style inferred from the current file and similar code. Context prioritization and phase transitions are implicit and driven by the tools and the current turn in the conversation.

---

## Ключевые выводы

### 3 фазы workflow:
1. ✅ **Task Reception** - минимальный контекст, извлечение ключевых терминов
2. ✅ **Index/Codebase Analysis** - semantic + exact search, выбор файлов
3. ✅ **File and Style Context** - извлечение стиля из текущего файла и похожих

### Инструменты поиска:
- ✅ `codebase_search` - semantic search (по смыслу)
- ✅ `grep` - exact symbols/strings
- ✅ `glob_file_search` - поиск по path/name

### Стилевой контекст (приоритет):
1. Current file (primary)
2. Sibling/related files
3. Configs (ESLint, Prettier, tsconfig)
4. Project root (README, configs)

### Типы контекста (приоритет):
1. Task context (до закрытия задачи)
2. Target file content
3. Code snippets для edits
4. Style examples
5. Architecture (если влияет на изменение)

### Progressive Disclosure:
- ✅ Broad → Narrow (registration form → specific file → function → exact place)
- ✅ Поэтапный поиск (сначала "registration form", потом "email validation")
- ✅ Не загружает весь codebase, только нужное на каждом шаге

### Iteration & Error Recovery:
- ✅ Search → Read → Edit → Check linter → Retry if needed
- ❌ Нет internal phase rollback
- ❌ Нет persistent memory между сессиями

---

## Применение в A2A

### Что реализовать:

1. **Phase State Machine** (чего нет у Cursor)
   ```javascript
   const phases = {
     RECEPTION: { next: 'ANALYSIS', context: 'minimal' },
     ANALYSIS: { next: 'EDITING', context: 'expanded' },
     EDITING: { next: 'VALIDATION', context: 'focused' },
     VALIDATION: { next: 'DONE', context: 'result' }
   };
   ```

2. **Search Tools Integration**
   ```javascript
   // terminator/modules/search/
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

3. **Style Context Extractor**
   ```javascript
   // terminator/modules/style-context/
   class StyleContextExtractor {
     extract(file) {
       return {
         naming: this.extractNaming(file),
         patterns: this.extractPatterns(file),
         imports: this.extractImportStyle(file),
         comments: this.extractCommentStyle(file)
       };
     }
     
     getSources(file) {
       return [
         file, // primary
         this.getSiblingFiles(file),
         this.getConfigs(file),
         this.getProjectRoot()
       ];
     }
   }
   ```

4. **Progressive Disclosure**
   ```javascript
   // terminator/orchestrator.js
   class ProgressiveOrchestrator {
     async execute(task) {
       // Stage 1: Broad
       const broad = await this.searchBroad(task.target);
       
       // Stage 2: Narrow
       const narrow = await this.searchNarrow(broad, task.action);
       
       // Stage 3: Exact
       const exact = await this.findExactLocation(narrow, task.object);
       
       return exact;
     }
   }
   ```

5. **Context Priority Manager**
   ```javascript
   // terminator/modules/context-manager/
   class ContextPriorityManager {
     prioritize(contexts) {
       return contexts.sort((a, b) => {
         const priority = {
           task: 1,
           targetFile: 2,
           codeSnippets: 3,
           styleExamples: 4,
           architecture: 5
         };
         return priority[a.type] - priority[b.type];
       });
     }
   }
   ```

### Для Recon Indexer:

- Использовать **semantic search** для "interesting files"
- Применять **progressive disclosure** (broad → narrow → exact)
- Извлекать **style context** для понимания паттернов

### Для Context Detector:

- **Phase 1**: Detect project type (Laravel, Vue, etc.)
- **Phase 2**: Search for key files (routes, models, controllers)
- **Phase 3**: Extract patterns and activate actions

---

## Отличия от A2A Design

| Aspect | Cursor | A2A (нужно добавить) |
|--------|--------|----------------------|
| Phase state machine | ❌ Implicit | ✅ Explicit |
| Persistent memory | ❌ No | ✅ Yes (между сессиями) |
| Dependency graph | ❌ Inferred | ✅ Explicit |
| Context prioritization | ❌ Fixed | ✅ Configurable |
| Error recovery | ❌ Ad-hoc | ✅ Structured |
| Rollback | ❌ Manual | ✅ Automatic |

---

## Вопросы для уточнения

- ❓ Как `codebase_search` работает под капотом? (embeddings? LSP?)
- ❓ Как определяется "semantic match"? (threshold? scoring?)
- ❓ Как обрабатываются conflicting styles в разных файлах?
- ❓ Как долго держится context window? (tokens? turns?)
- ❓ Есть ли fallback если semantic search не находит?

---

## Следующие шаги

1. ✅ Понять workflow phases
2. ⏳ Реализовать Phase State Machine
3. ⏳ Интегрировать search tools (semantic + exact + glob)
4. ⏳ Реализовать Style Context Extractor
5. ⏳ Добавить Progressive Disclosure
6. ⏳ Реализовать Context Priority Manager
7. ⏳ Добавить structured error recovery
8. ⏳ Тестировать на реальных задачах
