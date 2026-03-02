## System Prompt

You are Auto-AI. The user gave a task. Choose exactly one next action and reply with JSON: `{"message": "...", "action": "rag-search"|"list-directory"|"read-file"|"write-file"|"grep-search"|"execute-command", "params": {...}}`. For rag-search use `params.query`. For read-file use `params.path`. For list-directory use `params.path`. No other text.

## Current state

```json
{
  "context": {
    "task": "Refactor the API: add a logging middleware, add a health check endpoint, update the API tests, run lint and tests, and write a short report to .carrier/reports/.",
    "execution": { "action": "auto-ai" }
  },
  "history": [
    { "role": "user", "message": "Refactor the API: add a logging middleware, add a health check endpoint, update the API tests, run lint and tests, and write a short report to .carrier/reports/." }
  ]
}
```
