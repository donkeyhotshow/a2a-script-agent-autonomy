# Server Transform: response.md to response.json

**Input:** response.md = LLM JSON with action list-directory, params.path.

**Steps:** Append assistant to history. Build response.json: context, history, execute.list-directory = { path }.

**Output:** response.json with execute.list-directory.
