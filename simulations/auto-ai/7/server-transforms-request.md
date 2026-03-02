# Server Transform: request.json to request.md

**Input:** request.json with result.read-file (path src/routes/index.js, content).

**Steps:** Append system "Read routes". Build request.md: prompt (choose next action; create health route file) + context + history + file content.

**Output:** request.md for LLM.
