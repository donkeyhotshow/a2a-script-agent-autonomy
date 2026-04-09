# `agent-auto-ai/4-sub-1` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "Add GET /health returning JSON { ok: true }; wire the route in src/app.js.",
    "execution": {
      "action": "agent",
      "step": "read_code"
    },
    "workbench": {
      "sections": {
        "scratchpad": {
          "locate_started": true,
          "rag_ok": true
        },
        "files": {}
      }
    },
    "history": [
      {
        "role": "user",
        "message": "Add GET /health returning JSON { ok: true }; wire the route in src/app.js."
      },
      {
        "role": "assistant",
        "step": "inspect_structure",
        "message": "Running paginated RAG to find the Express entrypoint."
      },
      {
        "role": "system",
        "message": "RAG: src/app.js (page 1, pageSize 10, total 1, hasMore false)"
      },
      {
        "role": "assistant",
        "step": "read_code",
        "message": "Listing src/ to confirm layout before reading app.js."
      }
    ]
  },
  "result": {
    "list-directory": {
      "path": "src",
      "items": [
        "app.js",
        "routes/"
      ]
    }
  }
}
```
