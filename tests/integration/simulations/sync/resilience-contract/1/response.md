# `resilience-contract/1` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

```json
{
  "context": {
    "task": "Golden: resilience contract (paginated RAG drain, read-file queue, human gate).",
    "execution": {
      "action": "agent",
      "step": "human_gate"
    },
    "workbench": {
      "sections": {}
    },
    "history": []
  },
  "execute": {
    "form": {
      "title": "Confirm tool chain",
      "description": "Human gate before paginated RAG and queued read-file operations.",
      "choices": [
        {
          "id": "proceed_resilience",
          "label": "Proceed",
          "description": "Start paginated RAG drain, then read pkg/a.md and pkg/b.md."
        }
      ]
    }
  }
}
```
