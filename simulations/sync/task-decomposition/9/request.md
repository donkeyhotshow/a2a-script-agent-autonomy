# `task-decomposition/9` — copy of `request.json` for drift checks

**Not an LLM prompt.** This file exists so `a2a-server` `npm run sim:check-md` can compare the first fenced JSON block to `request.json`.

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "execute-action"
    },
    "history": [
      {
        "role": "user",
        "message": "add auth and refactor API"
      }
    ]
  },
  "result": {
    "write-file": {
      "path": ".carrier/tasks/task-1.md",
      "status": "success"
    }
  }
}
```