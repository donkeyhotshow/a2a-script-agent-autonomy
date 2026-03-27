# resilience-contract

Server-centric golden for **resilience patterns** documented in `a2a-server/DEV_STATE.md`:

1. **Human gate** — `execution.step` transitions through a confirm `form` before tools run.
2. **Paginated RAG drain** — two `rag-search` steps with `scratchpad` carrying `rag_offset` / `rag_has_more` (contract for multi-page drain).
3. **Read-file queue** — successive `read-file` executes; `context.files` accumulates paths from prior results.

Final step adds `context.workbench.slots.grayRoom` (control envelope) for UI parity with interrupt trace.
