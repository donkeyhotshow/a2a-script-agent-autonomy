# `task-decomposition/7` — copy of `request.json` for drift checks

**Not an LLM prompt.** **Sync golden** folder (`simulations/sync/`) — no render-markdown; this file is a mirror only for `sim:check-md` to compare to `request.json`.

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "write-doc"
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
      "path": ".carrier/tasks/task-1.md"
    }
  }
}
```