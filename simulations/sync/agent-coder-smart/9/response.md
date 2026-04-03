# `agent-coder-smart/9` — copy of `response.json` for drift checks

**Not an LLM prompt.** This file exists so `a2a-server` `npm run sim:check-md` can compare the first fenced JSON block to `response.json`.

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
  "execute": {
    "form": {
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Контент документу (.carrier/tasks/task-1.md)",
          "required": true
        }
      ]
    }
  }
}
```