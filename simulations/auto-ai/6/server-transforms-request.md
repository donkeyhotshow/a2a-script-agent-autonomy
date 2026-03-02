# Server Transform: request.json to request.md

**Input:** request.json with context, history, result.read-file (path, content).

**Steps:** Append system "Read path". Build request.md: prompt (choose next action from read-file result) + context + history + fileContent.

**Output:** request.md for LLM.
