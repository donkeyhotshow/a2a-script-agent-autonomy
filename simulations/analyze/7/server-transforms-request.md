# Server Transform: request.json → request.md

**Input:** `request.json` =
`{ "context": { ..., "history": [...] }, "result": { "choice": "save_report", "path": ".carrier/reports/architecture-report.md" } }`.

**Transformation steps:**

1. Extract `result.choice` = "save_report" and `result.path`
2. Add assistant message with continue action to `history`
3. Add user choice (save_report) to history
4. Create `request.md`:
    - System prompt for generating final report (write-file action)
    - Current state with `context` + `history` + `result.path`
5. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt for write-file + context with report path
