# Server Transform: request to request.md

**Input:** request.json with result write-file (tests/api.test.js success).

**Steps:** Append system Wrote test file. Build request.md: prompt next action execute-command npm run lint + context + history.

**Output:** request.md for LLM.
