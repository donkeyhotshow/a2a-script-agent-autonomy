# Server Transform: response to response.json

**Input:** LLM JSON with action completed and message.

**Steps:** Append assistant to history. response.json: context, execution.step = completed, history, result.message and result.completed = true, execute.form for optional continue.

**Output:** response.json with completed and form.
