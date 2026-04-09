# `task-decomposition/2` — copy of `response.json` for drift checks

**Not model output.** Same as `request.md`: fixture mirror only (`sim:check-md`), not part of the LLM pipeline on steps 1–2.

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "capture-task"
    },
    "history": []
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "task",
          "type": "textarea",
          "label": "Task description",
          "required": true
        }
      ]
    }
  }
}
```