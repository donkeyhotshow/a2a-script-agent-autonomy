# Server Transform: request to request.md

**Input:** request.json with result execute-command (npm test, exitCode 0, stdout, stderr).

**Steps:** Append system Tests passed. Build request.md: prompt next action write-file report to .carrier/reports/ + context + history.

**Output:** request.md for LLM.
