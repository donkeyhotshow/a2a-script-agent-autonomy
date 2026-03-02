# Server Transform: response to response.json

**Input:** LLM JSON with action grep-search and params.

**Steps:** Append assistant to history. response.json: context, history, execute.grep-search = params.

**Output:** response.json with execute.grep-search.
