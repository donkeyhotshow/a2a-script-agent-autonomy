# Server Transform: response.md to response.json

**Input:** LLM JSON with action write-file, params.path, params.content.

**Steps:** Append assistant to history. response.json: context, history, execute.write-file = { path, content }.

**Output:** response.json with execute.write-file.
