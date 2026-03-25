# T004 — Server: `result` uses action keys only

**Golden:** [`AGENTS.md`](../AGENTS.md) A2A Protocol; [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Request (`read-file`, `rag-search` examples).

**Code:** `a2a-server` handlers that fold client tool results into the next invoke (grep for `result:` / `context.history` merges).

**Goal:** No bare `result: { content: "..." }` without path; RAG/read-file/write paths follow one key under `result`.

**Acceptance:**
- Grep-based audit checklist in PR: list any remaining bare blobs; file follow-up tasks if scope is large.
- New or fixed paths include a test or sim step proving action-key shape.
