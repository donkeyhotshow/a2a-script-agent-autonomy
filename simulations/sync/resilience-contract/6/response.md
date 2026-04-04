# `resilience-contract/6` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

```json
{
  "context": {
    "task": "Golden: resilience contract (paginated RAG drain, read-file queue, human gate).",
    "execution": {
      "action": "agent",
      "step": "completed"
    },
    "workbench": {
      "sections": {},
      "slots": {
        "grayRoom": {
          "enabled": true,
          "planId": "sess-rc-1",
          "phase": "completed",
          "maxTurns": 10,
          "turn": 2,
          "remainingBudget": 8,
          "status": "completed",
          "lastReason": "compress_history",
          "timestamps": {
            "startedAt": "2026-03-27T12:00:00.000Z",
            "lastUpdateAt": "2026-03-27T12:00:02.000Z"
          },
          "traceRef": {
            "length": 3
          }
        }
      }
    },
    "files": {
      "pkg/a.md": "# A\nfirst chunk\n",
      "pkg/b.md": "# B\nsecond chunk\n"
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
      },
      {
        "role": "system",
        "message": "Read pkg/a.md (6 lines)"
      },
      {
        "role": "assistant",
        "step": "read_queue",
        "message": "Queueing pkg/b.md."
      },
      {
        "role": "system",
        "message": "Read pkg/b.md (6 lines)"
      },
      {
        "role": "assistant",
        "step": "completed",
        "message": "Resilience chain complete: RAG drained and both files in context.files."
      }
    ]
  },
  "execute": {
    "message": "Resilience chain complete: RAG drained and both files in context.files."
  }
}
```
