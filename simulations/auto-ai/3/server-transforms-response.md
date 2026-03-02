# Server Transform: response.md → response.json

**Input:** `response.md` = LLM output = JSON with `message`, `action`, `params`.

**Transformation steps:**

1. Parse JSON from response.md.
2. Append to history: assistant message with action rag-search, params.
3. Build `response.json`: context, history, execute.rag-search = { query: params.query }.
4. Return `response.json` to client.

---

**Output:** `response.json` = context + history + execute.rag-search
