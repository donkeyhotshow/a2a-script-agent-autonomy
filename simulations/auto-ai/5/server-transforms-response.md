# Server Transform: response.md → response.json

**Input:** `response.md` = LLM output with action read-file, params.path.

**Transformation steps:**

1. Append assistant to history. Build response.json: context, history, execute.read-file = { path }.
2. Return to client.

---

**Output:** `response.json` = context + history + execute.read-file
