# Step 2 — response (no LLM replay)

Mirror of `response.json` (not LLM output). Single `execute` action key.

```json
{
  "context": {
    "task": "Повний контракт agent у a2a-script-agent: золота simulations/sync/agent і всі типи execute, які бачить web-клієнт.",
    "execution": {
      "action": "agent",
      "step": "request"
    },
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "Ваш запит",
      "description": "Монорепо a2a-script-agent. Далі — повний ланцюжок інструментів agent (як у agent-coder-smart + workspace tools).",
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Повідомлення",
          "required": true
        }
      ]
    }
  }
}
```
