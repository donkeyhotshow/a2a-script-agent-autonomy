# Server Transform: request.json → request.md (step 4)

**Input:** `request.json` with `result.rag-search` (RAG results), context, history.

**Steps:**

1. Append system message to history: "RAG found: src/app.js, src/routes/index.js"
2. Build request.md: system prompt (you are Auto-AI; choose next action: read-file, write-file, execute-command, or reply) + context + history + ragResults
3. Send to LLM.

---

**Output:** request.md for LLM to decide next action (e.g. read-file src/app.js).
