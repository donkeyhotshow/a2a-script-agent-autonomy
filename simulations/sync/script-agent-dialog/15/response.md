# Step 15 — response (LLM requests commit message)

LLM asks for a commit message before committing.

```json
{
  "execute": {
    "form": {
      "title": "Коммит",
      "input": [{ "name": "message", "type": "text", "label": "Commit message", "required": true }]
    }
  }
}
```