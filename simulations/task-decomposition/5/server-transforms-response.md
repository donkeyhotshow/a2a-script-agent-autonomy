# Server Transform: response.md → response.json

**Input:** `response.md` = LLM output = steps per subtask (markdown).

**Transformation steps:**

1. Parse section3 (steps) from response.md
2. Build docVirtual: section1, section2, section3
3. Build response.json: context with docVirtual, execution.step = decompose-actions, execute.form = "Generate actions"
4. Return to client.

---

**Output:** `response.json` = context + docVirtual (1+2+3) + execute for next step
