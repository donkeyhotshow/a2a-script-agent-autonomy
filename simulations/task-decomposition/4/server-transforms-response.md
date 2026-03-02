# Server Transform: response.md → response.json

**Input:** `response.md` = LLM output = numbered list of subtasks (text).

**Transformation steps:**

1. Parse subtasks from `response.md` (numbered lines)
2. Build `docVirtual`: section1 = task, section2 = subtasks (markdown list)
3. Build `response.json`: context (with updated docVirtual), execution.step = decompose-steps, execute.form = "Generate
   steps"
4. Return `response.json` to client.

---

**Output:** `response.json` = context + docVirtual (1+2) + execute for next step
