# Server Transform: request.json to request.md

**Input:** request.json with result.write-file (path src/routes/health.js, success).

**Steps:** Append system "Wrote health.js". Build request.md: prompt (next action; add logging middleware) + context + history.

**Output:** request.md for LLM.
