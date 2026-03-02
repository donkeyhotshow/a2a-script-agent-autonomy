# Server Transform: response to response.json

**Input:** LLM JSON with action read-file and params.path.

**Steps:** Append assistant to history. Build response.json with context, history, execute.read-file = { path }.

**Output:** response.json with execute.read-file.
