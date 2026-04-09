# `resilience-contract/2` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

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
      }
    ]
  },
  "execute": {
    "rag-search": {
      "query": "resilience pagination drain",
      "limit": 2,
      "page": 1,
      "pageSize": 2
    }
  }
}
```
