# `promise-lifecycle/1` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "Golden: async promise lifecycle (poll then finalize).",
    "execution": {
      "action": "task",
      "step": "processing"
    }
  },
  "execute": {
    "message": "Pending: LLM/async work in flight. Poll GET /api/v1/requests/{promiseId}/result until status is completed (golden step 1)."
  }
}
```
