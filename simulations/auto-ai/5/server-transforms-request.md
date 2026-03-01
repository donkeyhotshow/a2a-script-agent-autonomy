# Server Transform: request.json → request.md (step 5)

**Input:** request.json with result.read-file (path + content of src/app.js).

**Steps:**

1. Add file content to context (e.g. fileContents['src/app.js'])
2. Build request.md: system prompt (choose next action: add health route via write-file, or execute-command) + task + history + file content
3. Send to LLM.

---

**Output:** request.md for LLM to produce write-file (e.g. new route file or patch).
