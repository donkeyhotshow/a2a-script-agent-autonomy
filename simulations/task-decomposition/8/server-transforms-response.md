# Server Transform: response.md → response.json

**Input:** `response.md` = LLM output = execution summary + updated doc (with one action marked [x]).

**Transformation steps:**

1. Extract updated doc from LLM response
2. Build response.json: context, result.updatedDoc or result.message = updated doc, execute.write-file with path
   .carrier/tasks/task-1.md and updated content
3. Return to client.

---

**Output:** response.json = context + execute.write-file (updated doc)
