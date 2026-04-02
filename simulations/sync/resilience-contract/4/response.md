# `resilience-contract/4` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

```json
{
  "context": {
    "task": "Golden: resilience contract (paginated RAG drain, read-file queue, human gate).",
    "execution": {
      "action": "agent",
      "step": "read_queue"
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
      },
      {
        "role": "assistant",
        "step": "read_queue",
        "message": "RAG drain complete; reading pkg/a.md first."
      }
    ]
  },
  "execute": {
    "read-file": {
      "path": "pkg/a.md"
    }
  }
}
```
