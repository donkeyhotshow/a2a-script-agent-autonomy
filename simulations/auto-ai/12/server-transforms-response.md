# Server Transform: response to response.json

**Input:** LLM JSON with action execute-command and params.command.

**Steps:** Append assistant to history. response.json: context, history, execute.execute-command = { command }.

**Output:** response.json with execute.execute-command.
