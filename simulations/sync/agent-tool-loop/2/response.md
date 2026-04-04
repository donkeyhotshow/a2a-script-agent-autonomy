# `agent-tool-loop/2` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "зчитати файл і знайти функцію",
    "execution": {
      "action": "agent",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "Знайди функцію calculateTotal в utils/helpers.js"
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "task",
          "type": "text",
          "label": "Повідомлення",
          "required": true
        }
      ]
    }
  }
}
```
