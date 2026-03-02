# Server Transform: request.json → request.md

**Input:** `request.json` with result.message = full task doc content, execution.step = execute-action.

**Transformation steps:**

1. Parse first unchecked action from doc (e.g. "Create src/auth/jwt.js...")
2. Build request.md: system prompt — execute exactly one action from the task doc; output what you did + updated doc
   with that action marked [x]
3. Current state: doc content in history
4. Return request.md to LLM.

---

**Output:** request.md = system prompt + doc for executing one action
