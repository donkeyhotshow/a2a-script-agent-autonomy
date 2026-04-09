# `agent-coder-smart/9` — copy of `request.json` for drift checks

**Not an LLM prompt.** This file exists so `a2a-server` `npm run sim:check-md` can compare the first fenced JSON block to `request.json`.

```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": {
      "action": "agent",
      "step": "execute-item"
    },
    "history": []
  },
  "result": {
    "write-file": {
      "path": ".carrier/tasks/task-1.md",
      "success": true
    }
  }
}
```