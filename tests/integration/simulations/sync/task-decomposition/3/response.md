# `task-decomposition/3` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "decompose-subtasks"
    },
    "history": [
      {
        "role": "user",
        "message": "add auth and refactor API"
      }
    ],
    "workbench": {
      "sections": {
        "section1": "add auth and refactor API"
      }
    }
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "proceed",
          "type": "submit",
          "label": "Generate subtasks"
        }
      ]
    }
  }
}
```
