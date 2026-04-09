# `agent-tool-loop/4` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "зчитати файл і знайти функцію",
    "execution": {
      "action": "agent",
      "step": "tool_read_file"
    },
    "history": [
      {
        "role": "user",
        "message": "Знайди функцію calculateTotal в utils/helpers.js"
      },
      {
        "role": "assistant",
        "step": "tool_rag",
        "message": "rag-search: simulations sync agent SCHEMA received.json — 2 top hits"
      }
    ]
  }
}
```
