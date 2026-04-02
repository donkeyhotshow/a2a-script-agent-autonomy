# Step 1 — request (no LLM replay)

Golden: `request.json` → `response.json`. First JSON fence matches `request.json`.

```json
{
  "context": {
    "task": "Gray room hook — baseline dialog (no interrupt in golden)",
    "execution": {
      "action": "dialog",
      "step": "message-only"
    }
  }
}
```
