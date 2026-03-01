# Server Transform: request.json → request.md

**Input:** `request.json` with `docVirtual.section1` (task), `docVirtual.section2` (subtasks), `execution.step = decompose-steps`.

**Transformation steps:**

1. Read task and subtasks from docVirtual
2. Build `request.md`: system prompt — for each subtask output 2–5 concrete steps (numbered). Format: "## Subtask N\n- Step N.1\n- Step N.2\n..."
3. Return `request.md` to LLM.

---

**Output:** `request.md` = system prompt + task + subtasks for step generation
