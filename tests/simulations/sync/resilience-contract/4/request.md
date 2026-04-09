# `resilience-contract/4` — request

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
      "rag_offset": 2,
      "rag_has_more": false
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
      },
      {
        "role": "assistant",
        "step": "rag_drain",
        "message": "Draining RAG page 2 (final page)."
      },
      {
        "role": "system",
        "message": "RAG page 2: docs/TAIL.md (hasMore false)"
      }
    ]
  },
  "result": {
    "rag-search": {
      "results": [
        {
          "path": "docs/TAIL.md",
          "score": 0.72
        }
      ],
      "files": [
        "docs/TAIL.md"
      ]
    }
  }
}
```
