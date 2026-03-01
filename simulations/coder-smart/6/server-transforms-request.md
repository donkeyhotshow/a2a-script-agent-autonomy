# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "docVirtual": {...} }, "result": { "proceed": true } }`.

**Transformation steps:**

1. Extract `context.docVirtual` (task, clarified, research plan)
2. Create `request.md`:
   - System prompt for creating checklist
   - Current state with `context` + `docVirtual`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with docVirtual for checklist
