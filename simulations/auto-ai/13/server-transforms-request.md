# Server Transform: request to request.md

**Input:** request.json with result execute-command (command npm run lint, exitCode 0, stdout, stderr).

**Steps:** Append system Lint passed. Build request.md: prompt next action execute-command npm test + context + history.

**Output:** request.md for LLM.
