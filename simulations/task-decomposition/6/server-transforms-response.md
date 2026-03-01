# Server Transform: response.md → response.json

**Input:** `response.md` = LLM output = actions per step (markdown).

**Transformation steps:**

1. Parse section4 (actions) from response.md
2. Build full doc from section1+2+3+4 (task, subtasks, steps, actions)
3. Build response.json: context with docVirtual full, execution.step = write-doc, execute.write-file with path and assembled markdown content
4. Return to client.

---

**Output:** response.json = context + execute.write-file (.carrier/tasks/task-1.md)
