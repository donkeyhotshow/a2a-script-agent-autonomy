## Flow for this turn

${flowControlHint}

## Current State

`workbench.sections` holds the task document sections you are building (section1…). Use optional `workbench.batch` / `workbench.slots` when the flow needs a queue or named artifacts.

```json
{
  "context": ${context},
  "workbench": ${workbench},
  "ragResults": ${ragResults}
}
```

## Constraints

- Always respond with valid JSON and obey the action-key shape (`step`, `message`, `execute`, `completed`).
- Never add extra text, markdown, or explanation outside the JSON block.
- Don't invent a solution until you've inspected the relevant materials via RAG/read-file.
- Guardrail: **no multiple actions** in a single turn (`execute` must have exactly one key).
