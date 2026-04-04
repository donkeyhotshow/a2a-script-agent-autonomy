# `resilience-contract/3` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "Golden: resilience contract (paginated RAG drain, read-file queue, human gate).",
    "execution": {
      "action": "agent",
      "step": "rag_drain"
    },
    "scratchpad": {
      "rag_offset": 0,
      "rag_has_more": true
    },
    "workbench": {
      "sections": {}
    },
    "history": [
      {
        "role": "user",
        "message": "Golden: resilience contract (paginated RAG drain, read-file queue, human gate)."
      },
      {
        "role": "assistant",
        "step": "human_gate",
        "message": "Confirmed: starting paginated RAG (page 1)."
      },
      {
        "role": "system",
        "message": "RAG page 1: docs/RAG.md, docs/OPS.md (hasMore true)"
      }
    ]
  },
  "result": {
    "rag-search": {
      "results": [
        {
          "path": "docs/RAG.md",
          "score": 0.91
        },
        {
          "path": "docs/OPS.md",
          "score": 0.85
        }
      ],
      "files": [
        "docs/RAG.md",
        "docs/OPS.md"
      ]
    }
  }
}
```
