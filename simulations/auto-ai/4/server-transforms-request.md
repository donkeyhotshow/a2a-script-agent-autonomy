# Server Transform: request.json → request.md

**Input:** `request.json` with `context`, `history`, `result["rag-search"]` (results, files).

**Transformation steps:**

1. Append to history: assistant (action rag-search), system ("RAG found: ..."), then build request.md with system prompt (choose next action given task and RAG results) + context + history + ragResults.
2. Return `request.md` to LLM.

---

**Output:** `request.md` = system prompt + current state + ragResults
