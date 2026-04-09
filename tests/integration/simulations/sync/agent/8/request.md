# Step 8 — request (no LLM replay)

Golden path: `request.json` → `server-transforms-request.json` → `response.json`. Per [`SCHEMA.md`](../../SCHEMA.md), **no** `server-transforms-response.json` on no-LLM steps.

First JSON fence must match `request.json` (`npm run sim:check-md` in `a2a-server`).

```json
{
  "context": {
    "task": "Повний контракт agent у a2a-script-agent: золота simulations/sync/agent і всі типи execute, які бачить web-клієнт.",
    "execution": {
      "action": "agent",
      "step": "tool_grep"
    },
    "history": [
      {
        "role": "user",
        "message": "Запусти повний прохід інструментів на симуляції sync/agent: RAG, list-directory, read-file, grep, file-exists, edit-patch, write-file, shell, run-script, script — шляхи лише в межах цього репо."
      },
      {
        "role": "assistant",
        "step": "human_gate",
        "message": "Підтверджено: починаю з RAG по simulations/sync/agent."
      },
      {
        "role": "system",
        "message": "rag-search: simulations sync agent — 2 top hits"
      },
      {
        "role": "system",
        "message": "Listed simulations/sync/agent: step dirs 1,2,…"
      },
      {
        "role": "system",
        "message": "read-file: simulations/sync/agent/description.md"
      },
      {
        "role": "system",
        "message": "grep-search: sim:validate — 1 match"
      }
    ]
  },
  "result": {
    "grep-search": {
      "success": true,
      "pattern": "sim:validate",
      "matches": [
        {
          "file": "simulations/sync/agent/description.md",
          "line": 12,
          "column": 10,
          "content": "npm run sim:validate",
          "match": "sim:validate"
        }
      ],
      "files": [
        "simulations/sync/agent/description.md"
      ],
      "total": 1
    }
  }
}
```
