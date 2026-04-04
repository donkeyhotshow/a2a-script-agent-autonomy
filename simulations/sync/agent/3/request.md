# Step 3 — request (no LLM replay)

Golden path: `request.json` → `server-transforms-request.json` → `response.json`. Per [`SCHEMA.md`](../../SCHEMA.md), **no** `server-transforms-response.json` on no-LLM steps.

First JSON fence must match `request.json` (`npm run sim:check-md` in `a2a-server`).

```json
{
  "context": {
    "task": "Повний контракт agent у a2a-script-agent: золота simulations/sync/agent і всі типи execute, які бачить web-клієнт.",
    "execution": {
      "action": "agent",
      "step": "request"
    },
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "message": "Запусти повний прохід інструментів на симуляції sync/agent: RAG, list-directory, read-file, grep, file-exists, edit-patch, write-file, shell, run-script, script — шляхи лише в межах цього репо."
  }
}
```
