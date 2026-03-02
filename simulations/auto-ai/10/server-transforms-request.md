# Server Transform: request to request.md

**Input:** request.json with result grep-search (matches array).

**Steps:** Append system Grep found. Build request.md: prompt next action read-file test file + context + history +
matches.

**Output:** request.md for LLM.
