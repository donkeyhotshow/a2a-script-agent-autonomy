# Server Transform: response.md → response.json (step 5)

**Input:** LLM response with action "write-file", params.path and params.content.

**Steps:**

1. Parse path and content
2. Build response.json: context, history updated, execute.write-file = { path, content }
3. Return to client.

---

**Output:** response.json with execute.write-file.
