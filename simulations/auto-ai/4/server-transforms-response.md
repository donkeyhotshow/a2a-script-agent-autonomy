# Server Transform: response.md → response.json (step 4)

**Input:** LLM response with action "read-file" and params.path.

**Steps:**

1. Parse action and params from response
2. Build response.json: context, history (append assistant + system "RAG results received"), execute.read-file with path from params
3. Return to client.

---

**Output:** response.json with execute.read-file = { path: "src/app.js" }
