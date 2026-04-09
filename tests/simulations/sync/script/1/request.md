# Step 1 — request (no LLM replay)

Golden: `request.json` → `server-transforms-request.json` → `response.json`. First JSON fence matches `request.json`.

```json
{
  "context": {
    "task": "Script central E2E (sync/script): router → scope form → script×3 ↔ client → run-script → gate → command → summary → follow-up.",
    "execution": {
      "action": "task",
      "step": "new"
    }
  },
  "result": {
    "message": "Script central E2E (sync/script): router → scope form → script×3 ↔ client → run-script → gate → command → summary → follow-up."
  }
}
```
