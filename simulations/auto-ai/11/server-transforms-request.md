# Server Transform: request to request.md

**Input:** request.json with result read-file (path tests/api.test.js, content).

**Steps:** Append system Read test file. Build request.md: prompt next action write-file to add health test + context + history + file content.

**Output:** request.md for LLM.
