# Step 2 — response (scope confirm form)

Mirror of response.json.

```json
{
  "context": {
    "task": "Script central E2E (sync/script): router → scope form → script×3 ↔ client → run-script → gate → command → summary → follow-up.",
    "execution": {
      "action": "fix-vue-imports",
      "step": "scope_confirm"
    },
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "Confirm scope",
      "description": "Server asks for a path root before running in-browser script phase A.",
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Repository root (.)",
          "required": true
        }
      ]
    }
  }
}
```
