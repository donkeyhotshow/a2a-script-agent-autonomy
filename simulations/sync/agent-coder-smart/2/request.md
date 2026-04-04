# `agent-coder-smart/2` — copy of `request.json` for drift checks

**Not an LLM prompt.** Steps 1–2 here are server-only (no `request.md → LLM → response.md`); see [`description.md`](../description.md). This file exists so `a2a-server` `npm run sim:check-md` can compare the first fenced JSON block to `request.json`.

```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": {
      "action": "agent",
      "step": "user-request"
    }
  },
  "result": {
    "choice": "agent"
  }
}
```