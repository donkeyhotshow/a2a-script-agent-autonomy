# Distributed Architecture - Ответ от Cursor

> **Статус**: ✅ Получен
> 
> **Вопрос**: `.amazonq/questions-to-cursor/DISTRIBUTED-ARCHITECTURE.md`
> 
> **Дата**: 2024-01-XX

---

## Ответ

В воркспейсе `cursor-graph-indexer` файлов не найдено — это пустой или новый проект. Ниже — **референсная архитектура** в формате твоего шаблона (VSCode + Extension + Cloud / A2A). Её можно использовать как основу и подстроить под реальный код, когда он появится.

---

### 1. COMPONENT HIERARCHY

| component | location | role | responsibilities | resources |
|-----------|----------|------|------------------|-----------|
| IDE (VSCode/Cursor) | client | UI | editing, file access, extensions host, UX | CPU, RAM, disk |
| Extension/Plugin | client | adapter | capture context, call agent API, render UI/results | CPU, RAM |
| Local Agent | client | orchestrator | optional local model, batching, retries, streaming | CPU, RAM, optional GPU |
| Proxy/Gateway | edge/cloud | router | auth, rate limit, TLS, routing, optional cache | network, minimal CPU |
| Main Server (Hub) | cloud | orchestrator | task analysis, decomposition, routing to workers | CPU, RAM |
| Worker Servers (Brains) | cloud | executor | LLM/inference, code analysis, specialized tasks | GPU, RAM, CPU |
| Cache Layer | edge/cloud | cache | session/query/result cache, embeddings | RAM/SSD |
| Storage Layer | cloud | persistence | projects, history, embeddings, artifacts | disk, object store |

---

### 2. COMMUNICATION FLOW

```
User types message in IDE
    → Extension captures: active file, selection, cursor, open files, project root
    → Extension (or Local Agent) builds request payload
    → HTTPS (or WSS) to Proxy
    → Proxy: auth (token/session), rate limit, optional cache lookup
    → Proxy forwards to Main Server (Hub)
    → Hub: classify task, decompose, pick workers
    → Hub → Workers (Brains): subtasks via RPC/HTTP
    → Workers: LLM/analysis, return partial results
    → Hub: aggregate, optionally stream
    → Hub → Proxy → Extension
    → Extension: apply edits / show UI / stream to user
```

---

### 3. RESPONSIBILITY DISTRIBUTION

**Extension:**
- Context: `gatherFileContext`, `gatherProjectStructure`, `gatherCursorPosition`, `gatherSelection`
- Local: syntax/UI only (highlight, basic completions if any)
- Communication: `sendToProxy` (or to Local Agent), `receiveFromProxy`, streaming handling
- UI: `showResults`, `showProgress`, apply diffs/edits

**Proxy:**
- Routing: `loadBalancing`, `failover` to backup Hub
- Security: `authentication`, `rateLimit`, TLS
- Optional: `cacheResults` for idempotent queries
- Observability: `logRequests`, `trackMetrics`

**Hub:**
- Tasks: `analyzeTask`, `decomposeTask`, `distributeSubtasks`, `aggregateResults`
- Workers: `selectBrain`, `monitorBrains`, health checks
- Context: `manageContext`, `optimizeContext` (trim, summarize for model)

**Brains (Workers):**
- Execution: `runLLM`, code-gen/analysis/refactor/test by type
- No user auth; trust Hub/Proxy.

---

### 4. DATA FLOW & PROTOCOLS

| layer | protocol | format | encryption | compression |
|-------|----------|--------|------------|-------------|
| IDE ↔ Extension | host API (IPC) | in-memory/JSON | N/A | no |
| Extension ↔ Proxy | HTTPS / WSS | JSON | TLS | gzip (optional) |
| Proxy ↔ Hub | HTTP/2 or gRPC | JSON or Protobuf | TLS | brotli/gzip |
| Hub ↔ Brain | gRPC or HTTP/2 | Protobuf or JSON | TLS | brotli |
| Cache/Storage | internal | binary/JSON | at-rest | optional |

---

### 5. CONTEXT DISTRIBUTION & OPTIMIZATION

- **Extension:** active file + selection + cursor + list of open file paths + project root; cap size (e.g. 50KB).
- **Proxy:** userId, sessionId, optional small cache keyed by (user, hash(context)).
- **Hub:** full request context; build "project slice" (relevant files + deps); trim to model window; optionally store project index/embeddings.
- **Brain:** only the slice needed for the subtask (e.g. 1–4 files + prompt); fit in model context (e.g. 4–8K tokens).

**Optimization:** hash-based cache at proxy; at Hub — embeddings/index for "relevant files", summarization for large files; at Brain — no extra context beyond what Hub sends.

---

### 6. TASK DECOMPOSITION (algorithm)

1. **Classify:** type (code-gen, refactor, analysis, test, chat), complexity, language.
2. **Estimate:** files touched, need for multi-step.
3. **Decompose (if needed):** e.g. "refactor to async" → (analyze current code) → (generate async version) → (integrate + fix imports).
4. **Assign:** map subtasks to brain types (code-analysis → Brain A, code-gen → Brain B).
5. **Execute:** parallel where independent, sequential where one subtask depends on another.
6. **Aggregate:** merge edits, dedupe, apply conflict resolution (e.g. one canonical patch).
7. **Validate:** optional lint/test step before returning to client.

---

### 7. BRAIN SPECIALIZATION

| brainType | specialization | model type | resources | typical latency |
|-----------|----------------|------------|-----------|-----------------|
| code-gen | generation, completion | LLM 7B–70B | 8–80GB GPU | 1–5s |
| code-analysis | static analysis, search | custom/LLM | 4–16GB RAM/GPU | 0.1–2s |
| refactoring | transform, migrate | LLM | 8–40GB GPU | 1–4s |
| testing | test generation | LLM | 8–40GB GPU | 2–5s |
| embeddings | index, retrieval | small encoder | 2–8GB GPU | 0.05–0.2s |

---

### 8. LOAD BALANCING

- **Proxy:** round-robin or least-connections across Hub instances; health checks; failover.
- **Hub:** task-based routing (by `brainType`); select worker by capability + least loaded queue; bounded queue per worker.
- **Brain:** internal queue (e.g. 4–16 concurrent requests per GPU); timeout (e.g. 30–60s); overflow → reject or queue at Hub.

---

### 9. CACHING STRATEGY

- **Extension:** file contents and project structure for current session (no TTL); optional small completion cache, TTL 60s, LRU.
- **Proxy:** key = hash(request + context); TTL 300–3600s; LRU eviction; only for read-like requests.
- **Hub:** project index/embeddings (long TTL or until reindex); task result cache by (task_type, context_hash), TTL 1h, LRU.
- **Brain:** model weights persistent; per-request context in RAM only (no durable cache).

---

### 10. FAILURE HANDLING

- **Extension:** retry 2–3x with backoff if proxy unreachable; show "Service unavailable"; optional offline queue.
- **Proxy:** if Hub down → try backup Hub; if no healthy Hub → 503 + retry-after; optional return stale cache with header.
- **Hub:** if brain down → retry same task on another brain of same type; if all busy → queue or 503; partial results only if designed (e.g. streaming).
- **Brain:** model error → retry once; then return error to Hub; Hub can try fallback brain or smaller model if configured.

---

### 11. PRACTICAL EXAMPLE: "Refactor this function to async/await"

**Step 1 – Extension:**  
Collect `file`, `functionName`, `code`, `cursorLine`, `language`. Send `{ task: "refactor-async", context }` to Proxy (or Local Agent). Handle stream/response and apply edits.

**Step 2 – Proxy:**  
Verify token; optionally `cache.get(hash(task+context))`; else POST to Hub; on response optionally `cache.set(..., ttl)`; return to Extension.

**Step 3 – Hub:**  
Classify as refactoring; decompose into [analyze-function, generate-async-version]; send first to code-analysis brain, then code-gen brain with analysis result; aggregate into one patch; return (or stream) to Proxy.

**Step 4 – Brain (code-gen):**  
Receive function + analysis; build prompt "Convert to async/await"; run LLM; validate syntax; return `{ code, confidence }`.

---

## Ключевые выводы

- ✅ **8 компонентов** в иерархии (IDE → Extension → Local Agent → Proxy → Hub → Brains → Cache → Storage)
- ✅ **Четкое разделение ответственности** на каждом уровне
- ✅ **Оптимизация контекста**: 50KB (client) → 500KB (hub) → 4MB (brain)
- ✅ **Специализированные "мозги"**: code-gen, analysis, refactoring, testing, embeddings
- ✅ **Многоуровневое кэширование**: Extension (session) → Proxy (1h) → Hub (24h) → Brain (persistent)
- ✅ **Graceful degradation**: retry, fallback, queue, partial results
- ✅ **Task decomposition**: classify → estimate → decompose → assign → execute → aggregate → validate

---

## Применение в A2A

### Для terminator/ системы:

1. **Extension = terminator/agents/local-agent.js**
   - Собирает контекст из IDE
   - Отправляет на proxy
   - Применяет результаты

2. **Proxy = terminator/proxy/ (новый модуль)**
   - Auth, rate limiting
   - Кэширование
   - Load balancing

3. **Hub = terminator/orchestrator.js (расширить)**
   - Task decomposition
   - Brain selection
   - Result aggregation

4. **Brains = terminator/modules/ (специализировать)**
   - code-quality/ → code-analysis brain
   - recon-indexer/ → embeddings brain
   - Добавить: code-gen, refactoring, testing brains

### Для Recon Indexer:

- Использовать **embeddings brain** для semantic search
- **Hub** для orchestration сканирования
- **Cache** для project index

### Для Context Detector:

- **Extension** собирает project context
- **Hub** анализирует и активирует actions
- **Brains** выполняют специализированные проверки

---

## Вопросы для уточнения

- ❓ Как Hub определяет, какой brain использовать? (capability matching algorithm)
- ❓ Как работает streaming между Hub и Extension?
- ❓ Как Hub обрабатывает partial failures (один brain упал, другие работают)?
- ❓ Как Extension обрабатывает conflicting edits от разных brains?
- ❓ Как измеряется "confidence" в результатах?

---

## Следующие шаги

1. ✅ Сохранить референсную архитектуру
2. ⏳ Спроектировать terminator/proxy/
3. ⏳ Расширить terminator/orchestrator.js для task decomposition
4. ⏳ Специализировать terminator/modules/ как brains
5. ⏳ Реализовать communication protocol (JSON/Protobuf)
6. ⏳ Добавить caching layers
7. ⏳ Реализовать failure handling
