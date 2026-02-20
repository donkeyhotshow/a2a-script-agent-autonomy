# H4: Index / codebase search checks

**Index:** [README.md](README.md) | **Server:** [index-query.ts](../../a2a-server/src/knowledge/index-query.ts), [search.service.ts](../../a2a-server/src/ml/search.service.ts) | **Client:** packages fulltext, rag, hybrid-search

Hacks to verify search over the codebase index: client-side index (RAG, fulltext, hybrid) or server-side `queryIndex` / `hybridSearch` when implemented.

---

## 1. Client-side index (current)

Client builds index under project `/.a2a/index` (e.g. RAG, fulltext). No HTTP search API in Vite plugin; search is used inside client app or via package API.

**Hack options:**

- **A. Build index for dev project**
  - From a2a-client: run indexer for websitestore path (e.g. `packages/rag` or `packages/fulltext` with `projectPath` = DEV_PROJECT path). Ensure `.a2a/index` is populated.
- **B. Query from Node**
  - Use client package (e.g. hybrid-search or fulltext searcher) with `projectPath` = websitestore; run search for queries like "Where is user validation?" or "FormRequest rules". Document expected file paths or snippets.
- **C. GET /api/a2a/projects/:id/data**
  - After indexing, call client plugin endpoint; assert `index` (e.g. rag-files.json) is non-empty and structure matches expectations.

---

## 2. Server-side index search (when implemented)

Server currently: `queryIndex(projectId, questions)` in request-processor calls `hybridSearch(projectId, question, { topK })` in `ml/search.service.ts`. Implementation is TODO (throws). When implemented:

- **Hack:** POST /requests with a task that generates questions (e.g. with codeBlocks so semantics extractor builds questions). Assert `result` includes index answers (e.g. `index_answers` or similar) with file paths/snippets.
- **Standalone:** If server exposes a search endpoint (e.g. GET /api/v1/projects/:id/search?q=...), add a hack that calls it with dev project id and a query; assert results contain expected files from websitestore.

---

## 3. Checklist

| Check | Where | Action |
|------|-------|--------|
| Index built for websitestore | Client .a2a/index | Run indexer; list files in index. |
| Client search returns relevant files | packages fulltext/rag/hybrid | Run search for 2–3 queries; document hits. |
| Server queryIndex returns answers | a2a-server (when hybridSearch implemented) | POST request → assert result has index answers. |

---

## References

- [requirements.md §8](../../a2a-client/docs/requirements.md) — метрики качества поиска (if present).
- [a2a-server/docs/neurons.md](../../a2a-server/docs/neurons.md) — request_files from neurons; client resolves paths. Index search feeds into questions → answers used by processor.
