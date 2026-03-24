## This turn

One action-key in `execute` per turn. Advance `step` when the current micro-goal is satisfied.

## Current State

```json
{
  "context": {
  "execution": {
    "action": "coder"
  },
  "history": [
    {
      "message": "як працює система авторизації?",
      "role": "user"
    }
  ],
  "task": "допоможи розібратись з кодом"
},
  "workbench": null,
  "ragResults": null
}
```

## Constraints

- Always respond with valid JSON and obey the action-key shape (`step`, `message`, `execute`, `completed`).
- Never add extra text, markdown, or explanation outside the JSON block.
- Don't invent a solution until you've inspected the relevant materials via RAG/read-file.
- Guardrail: **no multiple actions** in a single turn (`execute` must have exactly one key).
