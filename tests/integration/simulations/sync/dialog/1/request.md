# `dialog/1` — copy of `request.json` for drift checks

**Not an LLM prompt.** Steps 1–2 here are server-only (no `request.md → LLM → response.md`); see [`description.md`](../description.md). This file exists so `a2a-server` `npm run sim:check-md` can compare the first fenced JSON block to `request.json`.

```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "task",
      "step": "new"
    }
  },
  "result": {
    "message": "диалог"
  }
}
```
