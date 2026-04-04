# `agent-auto-ai/2` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "Add GET /health returning JSON { ok: true }; wire the route in src/app.js.",
    "execution": {
      "action": "agent",
      "step": "request"
    },
    "history": []
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "task",
          "type": "text",
          "label": "Task or message",
          "placeholder": "Describe what to do",
          "required": true
        }
      ]
    }
  }
}
```
