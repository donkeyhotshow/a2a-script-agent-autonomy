# Server Transform: request.json → request.md

**Input:** `request.json` with docVirtual.section1–3 (task, subtasks, steps), execution.step = decompose-actions.

**Transformation steps:**

1. Read task, subtasks, steps from docVirtual
2. Build request.md: system prompt — for each step output 1–3 concrete actions (what to do in code/CLI). Format: "## Step N.M\n- Action N.M.1\n..."
3. Return request.md to LLM.

---

**Output:** request.md = system prompt + task + subtasks + steps for action generation
