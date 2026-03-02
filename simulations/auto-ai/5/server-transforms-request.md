# Server Transform: request.json → request.md

**Input:** `request.json` with `context`, `history`, `result["list-directory"]` (path, entries).

**Transformation steps:**

1. Append system message ("Listed src/: ...") and build request.md: system prompt (choose next action; to read app entry
   use read-file with path src/app.js) + context + history + listResult.
2. Return `request.md` to LLM.

---

**Output:** `request.md` = system prompt + current state
