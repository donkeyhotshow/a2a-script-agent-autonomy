# Step 1 — request (no LLM replay)

Golden: `request.json` → `response.json`. First JSON fence matches `request.json`.

```json
{
  "context": {
    "task": "простий діалог без форми",
    "execution": {
      "action": "dialog",
      "step": "message-only"
    }
  }
}
```
