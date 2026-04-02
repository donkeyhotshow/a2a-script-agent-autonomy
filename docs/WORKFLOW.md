# A2A Workflow (Linear Model)

This document defines the base linear flow and operational terms used in the project.

**Operator control plane:** the live stack is used as a **sub-agent**—driven by **HTTP** on the Client API: **`Task Monitor`** ([`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)) for indexed tasks through session dialog, or **`curl`** for manual turns. See [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md).

**Empty task queue:** **not** “nothing to do.” Prune root/module [`DEV_STATE.md`](../DEV_STATE.md), discover work (code, sims, risks), write tasks into `DEV_STATE` / `tasks/pending/`. See [`AGENTS.md`](../AGENTS.md) — **“Empty queue — mandatory”** (under Quick Reference) + DEV_STATE Protocol — and [`methodology/tasks.md`](../methodology/tasks.md).

## Flow Diagram

```
Client/UI   Client API      Server/Core       LLM/External AI
   │            │                │                  │
   │ message    │                │                  │
   │───────────>│ request.json   │                  │
   │            │───────────────>│ request.md       │
   │            │                │─────────────────>│
   │            │                │ response.md      │
   │            │                │<─────────────────│
   │            │ response.json  │                  │
   │            │<───────────────│                  │
   │ received.json               │                  │
   │<───────────│                │                  │
```

## Core Concepts

| Concept | Definition |
|---------|-----------|
| Normal Cycle | User input through server (with optional LLM) and back to client |
| Red Room | Client auto-replies to tool execute; no user input required |
| Gray Room | Server substeps before final client response |
| Black Room | Future proxy optimization (not active) |

## Code module names (codewords)

**Scope:** **Expert**, **Analyst**, and **Professional** are **names for separate pieces of software**—services, pipelines, or client modules you implement and call. They are **not** LLM roles, **not** “the model,” and **not** ML training jobs unless you **explicitly** plug a model into that module. Default assumption: **ordinary code** (filesystem, parsers, heuristics, indexes).

| Term | Definition |
|------|------------|
| **Expert** | **Client code**: handler for console scripts (build, test, linters, and similar tools). Turns raw tool output (logs, exit codes) into structured data the rest of the workflow can use. Not the remote LLM. |
| **Analyst** | **Client (or host) code**: same subsystem as the **ignore autodetector**—a **recursive structural pass** that (1) **detects or refines what should be ignored** (`.gitignore`, editor/tool ignores, heuristics for vendor/build trees) and (2) **measures the tree** (counts, depth, hot spots) into a **compact snapshot**. Runs **before** Red Room so reads/lists use those boundaries. Not Gray Room / sim lint / `operationHistory`. |
| **Professional** | **Client code** on the **RAG search** path: takes retrieval hits and **extends the search output** (ranking, grouping, snippets, optional short summaries) for the UI or the next **code** step. Complements server Gray Room `auto_rag_page`; does not replace it. See hooks below. |

### Professional — client RAG extensions

**Placement:** extend the client indexer/search pipeline and/or the agent RAG chain so “Professional” runs **after** base retrieval and **before** or **while** results are shown or sent onward.

**Implementation hooks (current codebase):** `packages/rag` searcher / chunk + ranking pipeline; Vite Client API agent RAG chain (`vite-plugin-a2a/routes/utils/agent-rag-chain.js`). “Professional” is the named home for **intelligent output shaping** in that neighborhood.

**Possible techniques** (pick as needed; all client-local unless you deliberately call the server):

- **Re-rank** — combine lexical score with signals (path depth, recency, symbol kind, heading proximity).
- **Snippet intelligence** — widen snippets around hits, dedupe overlapping chunks, strip noise.
- **Cluster** — group hits by file or topic; show one “best” span per cluster + jump links.
- **Query aids** — light query expansion, synonym/alias map for project terms, typo normalization for identifiers.
- **Coverage hints** — flag gaps (“no hits under `tests/`”) so the user knows search is incomplete.
- **Micro-synthesis** — optional short bullet “what the top results agree on” (**rules/code** or an **optional** small local model invoked **by** this module), clearly labeled as derived, not authoritative.

### Analyst — project structure scan, ignore autodetector, Red Room read safety

**Role (software):** **Analyst** is one **code** subsystem with two coupled jobs—what you earlier scoped as an **autodetector for ignored files/folders**, plus **tree metrics** for policy:

1. **Ignore autodetection** — infer, suggest, or validate **exclude surfaces**: existing `.gitignore` / `.cursorignore` / tool configs, **plus** signals from the walk (e.g. huge subtrees, known vendor dir names, build output patterns). Output can be “effective ignore set” for the client, optional **proposed patches** (never silent overwrite of user files unless explicitly enabled), and **conflicts** (tracked path that scan says should be ignored).
2. **Structure snapshot** — same pass fills **counts, depth, largest dirs** so listing/read tools do not have to rediscover the tree blindly.

**Ordering:** The scan (or its latest snapshot + effective ignores) should be **available early**—before Red Room auto-executes reads/lists—so the client answers both “should this path be skipped?” and “is listing here safe?” without dumping huge directories into context.

**Typical snapshot fields** (extend as needed):

- **Effective ignore rules** (resolved globs/paths) and optional **autodetect proposals** with rationale (e.g. subtree file count over threshold under `dist/`).
- Per-directory **immediate child count** (entries returned by one `list` / `readdir`).
- **Subtree file totals** and **max depth** under selected roots (**after** applies ignores from step 1).
- **Largest directories** by child count or by subtree size (top-N).
- Optional: symlink loops guarded, binary-heavy paths flagged, “vendor” roots marked.

**Default thresholds (tune per project):** flat **500** is a weak signal; prefer **power-of-two tiers** so limits are easy to remember and align with buffer sizes.

| Signal | Suggested default | Policy idea |
|--------|-------------------|-------------|
| Immediate children in one directory | **≥ 256** | **Caution:** do not paste a full listing into prompts; return capped sample + total count + “use search/glob”. |
| Immediate children in one directory | **≥ 1024** | **High risk:** treat full inline list as unsafe; require Analyst index, paginated API, or explicit user override. |
| Files in a subtree (recursive, ignores applied) | **≥ 10 000** | **High risk:** no naive recursive read/list for LLM; use indexed search, bounded globs, or pre-aggregated Analyst stats only. |

Numbers are **defaults**, not laws: monorepos and `node_modules` policies should lower caps or hard-exclude paths regardless of counts.

**Split reminder:** **Expert** / **Professional** / **Analyst** = **three code modules** (above). **Expert** = tool output → structure. **Professional** = RAG hits → enriched presentation. **Analyst** = ignore autodetection + repo tree metrics → safe read/list policy. Gray Room / sim lint / `operationHistory` remain **separate** (server/audit side)—not renamed to Analyst here.

### Red Room

Client auto-replies to tool `execute` (no user input):
- Trigger: Server asks for tool action
- Behavior: Client sends auto-result
- Next: Full cycle continues with result
- Meaning: Direct operational path for automatic tools

### Gray Room

Server-driven LLM/transform substeps before final client response:
- Trigger: Response transform emits `interrupt`
- Behavior: Server runs compress/thinking/re-LLM substeps
- Result: Client gets one response when chain ends
- Constraint: No extra `/next` calls for substeps (unlike red room)

### Black Room

Future smart loop inside `ai-integration` proxy:

- Planned area for proxy-side autonomous optimization logic.
- Out of current implementation scope.

## Phrase Mapping

- **"normal cycle"** -> regular message flow.
- **"red room"** -> Client auto-replies to tool `execute`, then full cycle.
- **"gray room"** (Трансмутация) -> Серверная цепочка LLM-вызовов перед возвратом клиенту: compress_history (сжатие истории), thinking (структурированное мышление), auto_rag_page (RAG поиск), auto_read_file (авто-чтение файлов), clarify (уточнение).
- **"black room"** -> (Planned) `ai-integration` proxy loop.
- **"expert"** -> **Code module** (client): console-script handler; normalizes build/test/tool logs into structured input—not an LLM persona.
- **"professional"** -> **Code module** (client): RAG hit post-processing (ranking, snippets, clustering, optional micro-synthesis)—not an LLM persona.
- **"analyst"** / **"ignore autodetector"** -> **Code module** (client/host): recursive walk = ignore detection + structure metrics for safe list/read—not an LLM persona.

## Related Documentation
- [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md) - Подробная документация (242 строки)
- [`docs/adr/ADR-0029-server-interrupt-loop.md`](adr/ADR-0029-server-interrupt-loop.md) - ADR решения
- [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../../a2a-client/docs/WEB_UI_PROTOCOL.md) - Client web flow; `rag-search` and agent execute projection

