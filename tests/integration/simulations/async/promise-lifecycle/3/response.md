# `promise-lifecycle/3` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "Golden: async promise lifecycle (failed terminal).",
    "execution": {
      "action": "task",
      "step": "failed",
      "status": "failed"
    }
  },
  "execute": {
    "message": "Async work ended in failure (golden step 3). Real poll payloads may expose top-level `status: failed` and `error` from GET /api/v1/requests/{id}/result; this fixture is the invoke-shaped snapshot merged into session."
  }
}
```
