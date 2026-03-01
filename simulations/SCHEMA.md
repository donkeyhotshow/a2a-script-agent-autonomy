# Simulations schema (canonical)

Align all simulations to avoid redundant or conflicting values.

## Request

- **First request**: `{ "task": "..." }` only.
- **Client chose action**: `result.action` (not `actionId`). Example: `{ "context": {...}, "result": { "action": "fix-vue-imports" } }`.
- **Later steps**: `context` + `result` or `input` as per flow.
- **result for read-file**: use action-key shape so server has path + content. Good: `result: { "read-file": { "path": "src/auth.js", "content": "..." } }`. Bad: `result: { "content": "..." }` (path unknown).

## Response (server)

- **First response**: `context`, `actions[]`, optionally `fallbackActions[]`.
- **Action object**: `action`, `title`, `description`, `priority`; optional `matchScore`, `steps[]`, `repeatSteps[]`.
- **Step object**: `action`, `title`, `description`, `priority`; optional `input`, `output`.
- **fallbackActions** (when present): `mode`, `title`, `description`, `fallbackType`. Use same two entries: `auto-ai` (llm_generation), `task-decomposition` (manual).

### execute (canonical)

`execute` is an object where **each key is the action type**, value is params. No flat `"action": "<name>"` with params as siblings.

- **Good**: `"execute": { "read-file": { "path": "src/auth.js" } }`, `"execute": { "write-file": { "path": "...", "content": "..." } }`, `"execute": { "rag-search": { "query": "..." } }`, `"execute": { "form": { "input": [...] } }`, `"execute": { "script": { "input": {}, "output": "...", "code": "..." } }`.
- **Bad**: `"execute": { "action": "read-file", "file": "src/auth.js" }` (flat; param name can collide with `action`).

When response includes both message and form (e.g. coder-dialog), use `"message"` at top level of response if needed; `execute` stays action-key only (e.g. `execute.form` or `execute["read-file"]`).

## JSON

- No trailing commas. Valid JSON only.

## Reference sims

- fix-vue-imports, fix-vue-imports-batched: full steps + fallbackActions.
- dialog: repeatSteps + fallbackActions + matchScore (aligned with coder-dialog).
- coder-dialog: single step + fallbackActions.
- coder-smart: steps user-request → rag-clarify → rag-research-plan → checklist → write-doc → execute-item; virtual doc (1→1+2→1+2+3→full), write to .carrier/tasks/; then loop (history = [doc], LLM do item, update doc).
