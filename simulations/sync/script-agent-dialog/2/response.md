# Step 2 — response (dialog request)

Mirror of response.json: dialog request form with a text field.

```json
{
  "context": {
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "Message",
      "description": "Describe blockers; the script-aware dialog watches for import errors.",
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Message",
          "required": true
        }
      ]
    }
  }
}
```
