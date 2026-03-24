# Auto-AI Simulation

## Description

Final simulation: **all agent capabilities** the client must support or will support. Auto-AI is the reference for what
the LLM can ask the client to do via `execute.<action>`.

**Type: ai-action.** Steps are not hardcoded; server shows available steps, LLM chooses next from its response; each
step can be a separate LLM request.

Full list of actions: **[ACTIONS-MAP.md](ACTIONS-MAP.md)**.

## Use case (this simulation) — extensive

User task: *"Refactor the API: add a logging middleware, add a health check endpoint, update the API tests, run lint and
tests, and write a short report to .carrier/reports/."*

The flow uses **many steps and many actions**: form → rag-search → list-directory → read-file (twice) → write-file (
health) → write-file (logging) → grep-search → read-file (test) → write-file (test update) → execute-command (lint) →
execute-command (npm test) → write-file (report) → completed. So the sim exercises: **form**, **rag-search**, *
*list-directory**, **read-file**, **write-file** (4×), **grep-search**, **execute-command** (2×), **completed**.

## File structure (per simulations/SCHEMA.md)

- **Steps without LLM** (1, 2, 16): only `request.json`, `response.json`.
- **Steps with LLM** (3–15): all 6 files in pipeline order — `request.json` → `server-transforms-request.json` →
  `request.md` → `response.md` → `server-transforms-response.json` → `response.json`.

```
simulations/auto-ai/
├── description.md
├── analysis.md
├── ACTIONS-MAP.md
├── WORKFLOW.md
├── 1/   request.json, response.json
├── 2/   request.json, response.json
├── 3/ … 15/   request.json, server-transforms-request.json, request.md, response.md, server-transforms-response.json, response.json
└── 16/  request.json, response.json
```

## Rules

- **Context**: server controls context; client does not add to it.
- **Result**: action-key shape: `result["rag-search"]`, `result["read-file"]`, `result["list-directory"]`,
  `result["grep-search"]`, etc.
- **AI-step semantics**: LLM proposes `step` и `execute` в ответе на prompt, но сервер нормализует/ограничивает эти
  предложения и записывает финальные значения в `context.execution.step` и `execute`.
- **LLM-guided flow**: LLM uses ACTIONS-MAP as the catalogue of possible tools; сервер остаётся источником истины для
  фактического шага и выполняемых действий.
