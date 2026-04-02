# `orchestrator-dialog/3` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "orchestrate ADR review",
    "execution": {
      "action": "orchestrator-dialog",
      "step": "gather-goal"
    },
    "history": [
      {
        "role": "user",
        "message": "Read ADR-0027 and tell me how to check documentation consistency across canonical sources."
      }
    ]
  },
  "result": {
    "message": "Read ADR-0027 and tell me how to check documentation consistency across canonical sources."
  }
}
```
