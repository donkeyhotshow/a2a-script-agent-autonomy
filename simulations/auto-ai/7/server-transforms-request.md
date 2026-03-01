# Server Transform: request.json → request.md (step 7)

**Input:** request.json with result.execute-command (command, exitCode, stdout, stderr).

**Steps:**

1. Append system message: "Command npm test finished (exit 0)"
2. Build request.md: system prompt (summarize and complete or continue) + task + history + command result
3. Send to LLM.

---

**Output:** request.md for LLM to produce completed + summary.
