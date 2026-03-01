# Server Transform: request.json → request.md

**Input:** `request.json` with `context.docVirtual.section1` (task) and `execution.step = decompose-subtasks`.

**Transformation steps:**

1. Read `docVirtual.section1` (task text)
2. Build `request.md`: system prompt for decomposing task into 3–7 subtasks (concise, ordered)
3. Current state: task only
4. Return `request.md` to send to LLM.

---

**Output:** `request.md` = system prompt + task for subtask generation
