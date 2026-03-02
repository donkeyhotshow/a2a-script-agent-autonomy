# Simulations schema (canonical)

Align all simulations to avoid redundant or conflicting values.

## File layout (per step)

Each step folder can contain up to 6 files, in pipeline order:

| File | Direction | Description |
|------|------------|-------------|
| `request.json` | Client → Server | Payload from client. |
| `server-transforms-request.md` | — | How the server processes `request.json` and builds the LLM input (transformation before calling LLM). Optional. |
| `request.md` | Server → LLM | Markdown sent to LLM (system prompt + current state). |
| `response.md` | LLM → Server | Expected LLM output (e.g. JSON with `message`, `action`). |
| `server-transforms-response.md` | — | How the server processes `response.md` and builds the client payload (transformation before sending to client). Optional. |
| `response.json` | Server → Client | Payload sent to client (context + execute, etc.). |

**Order:** request.json → server-transforms-request.md → request.md → response.md → server-transforms-response.md → response.json.

Not every step has all 6 files: steps without LLM typically have only `request.json` and `response.json`; steps with LLM add the .md files; transform docs are optional and describe server logic.

## Request

- **First request**: `{ "task": "..." }` only.
- **Client chose action**: when server sent `actions[]` use `result.action`; when server sent `execute.form` use `result.choice` (id of selected option). Example: `{ "context": {...}, "result": { "choice": "fix-vue-imports" } }`.
- **Later steps**: `context` + `result` or `input` as per flow.
- **result for read-file**: use action-key shape so server has path + content. Good: `result: { "read-file": { "path": "src/auth.js", "content": "..." } }`. Bad: `result: { "content": "..." }` (path unknown).
- **result for rag-search**: use action-key shape so server can pass results to LLM as `ragResults`. Good: `result: { "rag-search": { "results": [ { "file": "...", "score": 0.95, "snippet": "..." } ], "files": ["path1", "path2"] } }`. Optional: `"query": "..."` for traceability. Bad: `result: { "results": [...], "files": [...] }` (no action key).

## Response (server)

- **First response**: either (1) `context`, `actions[]`, optionally `fallbackActions[]`; or (2) `context`, `execute.form` with `choices`. When using form: no-LLM actions first (higher priority), then fallbackActions merged into same choices; client replies with `result.choice`.
- **Action object**: `action`, `title`, `description`, `priority`; optional `matchScore`, `steps[]`, `repeatSteps[]`.
- **Step object**: `action`, `title`, `description`, `priority`; optional `input`, `output`.
- **fallbackActions** (when present): `mode`, `title`, `description`, `fallbackType`. Use same two entries: `auto-ai` (llm_generation), `task-decomposition` (manual).

### execute (canonical)

`execute` is an object where **each key is the action type**, value is params. No flat `"action": "<name>"` with params as siblings.

- **Good**: `"execute": { "read-file": { "path": "src/auth.js" } }`, `"execute": { "write-file": { "path": "...", "content": "..." } }`, `"execute": { "rag-search": { "query": "..." } }`, `"execute": { "form": { "input": [...] } }`, `"execute": { "script": { "input": {}, "output": "...", "code": "..." } }`, `"execute": { "execute-command": { "command": "npm test" } }`.
- **Bad**: `"execute": { "action": "read-file", "file": "src/auth.js" }` (flat; param name can collide with `action`).
- **result for execute-command**: client returns `result: { "execute-command": { "command": "npm test", "exitCode": 0, "stdout": "...", "stderr": "" } }` (action-key shape). Server can pass to LLM for summary or next step.

When response includes both message and form (e.g. coder), use `"message"` at top level of response if needed; `execute` stays action-key only (e.g. `execute.form` or `execute["read-file"]`).

**execute.form with choices:** optional `form.title`, `form.choices` = `[{ "id": "...", "label": "..." }]` (e.g. continue_search, save_report). Client sends `result.choice` + optional `result.message` / `result.path`. Save path default: `.carrier/reports/` (e.g. `architecture-report.md`).

## JSON

- No trailing commas. Valid JSON only.

## Reference sims

- fix-vue-imports: first response = execute.form with choices (no-LLM first, fallback merged); then script steps. fix-vue-imports-batched: batched variant.
- dialog: repeatSteps + fallbackActions + matchScore (aligned with coder).
- coder: single step + fallbackActions.
- coder-smart: steps user-request → rag-clarify → rag-research-plan → checklist → write-doc → execute-item; virtual doc (1→1+2→1+2+3→full), write to .carrier/tasks/; then loop (history = [doc], LLM do item, update doc).
- analyze: dialog like coder; AI searches arch docs (RAG), confirms facts or lists discrepancies; optional write-file report.
- auto-ai: full capabilities — form, rag-search, read-file, write-file, execute-command (command, exitCode, stdout, stderr); true end-to-end flow.