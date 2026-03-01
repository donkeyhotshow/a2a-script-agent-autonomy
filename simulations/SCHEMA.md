# Simulations schema (canonical)

Align all simulations to avoid redundant or conflicting values.

## Request

- **First request**: `{ "task": "..." }` only.
- **Client chose action**: `result.action` (not `actionId`). Example: `{ "context": {...}, "result": { "action": "fix-vue-imports" } }`.
- **Later steps**: `context` + `result` or `input` as per flow.

## Response (server)

- **First response**: `context`, `actions[]`, optionally `fallbackActions[]`.
- **Action object**: `action`, `title`, `description`, `priority`; optional `matchScore`, `steps[]`, `repeatSteps[]`.
- **Step object**: `action`, `title`, `description`, `priority`; optional `input`, `output`.
- **fallbackActions** (when present): `mode`, `title`, `description`, `fallbackType`. Use same two entries: `auto-ai` (llm_generation), `task-decomposition` (manual).

## JSON

- No trailing commas. Valid JSON only.

## Reference sims

- fix-vue-imports, fix-vue-imports-batched: full steps + fallbackActions.
- dialog: repeatSteps + fallbackActions + matchScore (aligned with coder-dialog).
- coder-dialog: single step + fallbackActions.
- coder-smart: no steps — single LLM flow; creates task MD (запит, формулювання, план, чеклист) on client, then execute loop (history = [task doc], LLM does next checklist item, MD updated).
