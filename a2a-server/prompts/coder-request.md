## Flow for this turn

${flowControlHint}

## Current State

`workbench.sections` holds the task document sections you are building (section1…). Use optional `workbench.batch` / `workbench.slots` when the flow needs a queue or named artifacts.

**Incremental section edits — `workbench_ops` (preferred):** same contract as Auto-AI. Short commands: `{"o":"s","k":"section2","v":"full text"}`, `{"o":"a","k":"section1","t":"extra bullet"}`, `{"o":"rm","k":"section3"}`. Server applies `workbench.sections` merge first, then `workbench_ops`. Use full `workbench.sections` only when rewriting many keys at once.

```json
{
  "context": ${context},
  "workbench": ${workbench},
  "ragResults": ${ragResults}
}
```

## Constraints

- Always respond with valid JSON and obey the action-key shape (`step`, `message`, `execute`, `completed`). Optional `workbench_ops` and optional `workbench.sections` update persisted workbench (ops after merge).
- Never add extra text, markdown, or explanation outside the JSON block.
- Don't invent a solution until you've inspected the relevant materials via RAG/read-file.
- Guardrail: **no multiple actions** in a single turn (`execute` must have exactly one key).
