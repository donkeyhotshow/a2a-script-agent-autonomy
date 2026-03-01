# Auto-AI Simulation

## Description

Final simulation: **all agent capabilities** the client must support or will support. Auto-AI is the reference for what the LLM can ask the client to do via `execute.<action>`.

Full list of actions: **[ACTIONS-MAP.md](ACTIONS-MAP.md)**.

## Use case (this simulation) — extensive

User task: *"Refactor the API: add a logging middleware, add a health check endpoint, update the API tests, run lint and tests, and write a short report to .carrier/reports/."*

The flow uses **many steps and many actions**: form → rag-search → list-directory → read-file (twice) → write-file (health) → write-file (logging) → grep-search → read-file (test) → write-file (test update) → execute-command (lint) → execute-command (npm test) → write-file (report) → completed. So the sim exercises: **form**, **rag-search**, **list-directory**, **read-file**, **write-file** (4×), **grep-search**, **execute-command** (2×), **completed**.

## File structure

```
simulations/auto-ai/
├── description.md
├── analysis.md
├── ACTIONS-MAP.md
├── WORKFLOW.md
├── 1/  … 16/   (steps: 1 task→actions, 2 form, 3–15 LLM-driven chain, 16 optional thanks)
```

## Rules

- **Context**: server controls context; client does not add to it.
- **Result**: action-key shape: `result["rag-search"]`, `result["read-file"]`, `result["list-directory"]`, `result["grep-search"]`, etc.
- **LLM-controlled flow**: LLM chooses next action from ACTIONS-MAP.
