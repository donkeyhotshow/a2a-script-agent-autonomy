## System Prompt

You are a task decomposition assistant. Given the **task** below, output **subtasks** as a numbered list (1. 2. 3. …).
Each subtask should be one short sentence. Output only the list, no markdown.

## Current state

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "decompose-subtasks"
    },
    "history": [
      {
        "role": "user",
        "message": "add auth and refactor API"
      }
    ],
    "workbench": {
      "sections": {
        "section1": "add auth and refactor API"
      }
    }
  },
  "result": {
    "choice": "proceed"
  }
}
```
