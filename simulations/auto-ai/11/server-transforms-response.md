# Server Transform: response to response.json

**Input:** LLM JSON with action write-file and params.path, params.content.

**Steps:** Append assistant to history. response.json: context, history, execute.write-file = { path, content }.

**Output:** response.json with execute.write-file.
