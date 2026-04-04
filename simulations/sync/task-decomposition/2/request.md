# `task-decomposition/2` — copy of `request.json` for drift checks

**Not an LLM prompt.** Steps 1–2 here are server-only (no `request.md → LLM → response.md`); see [`description.md`](../description.md). This file exists so `a2a-server` `npm run sim:check-md` can compare the first fenced JSON block to `request.json`.

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "capture-task"
    }
  },
  "result": {
    "choice": "task-decomposition"
  }
}
```