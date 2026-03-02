# Server Transform: request.json → request.md

**Input:** `request.json` with `context`, `result.message` (user task).

**Transformation steps:**

1. Build `history`: one entry `{ "role": "user", "message": result.message }`.
2. Build `request.md`: system prompt (you are Auto-AI; choose one next action: rag-search, list-directory, read-file, write-file, grep-search, execute-command; reply with JSON `message`, `action`, `params`) + section **Current state** with JSON: context, history.
3. Return `request.md` to send to LLM.

---

**Output:** `request.md` = system prompt + current state (context, history).
