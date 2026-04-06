# `dialog/2` — copy of `response.json` for drift checks

**Not model output.** Same as `request.md`: fixture mirror only (`sim:check-md`), not part of the LLM pipeline on steps 1–2.

```json
{
  "context": {
    "task": "диалог",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "dialog",
      "step": "request"
    }
  },
  "execute": {
    "form": {
      "title": "Повідомлення",
      "description": "Введіть повідомлення для продовження діалогу.",
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
