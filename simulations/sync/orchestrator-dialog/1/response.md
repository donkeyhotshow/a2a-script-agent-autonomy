# `orchestrator-dialog/1` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

```json
{
  "context": {
    "task": "orchestrate ADR review",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "task",
      "step": "router"
    }
  },
  "execute": {
    "form": {
      "title": "Choose a workflow",
      "description": "Select the mode that best fits the requested coordination work.",
      "choices": [
        {
          "id": "dialog",
          "label": "AI dialog",
          "description": "Free-form chat to explore the goal."
        },
        {
          "id": "auto-ai",
          "label": "Auto-AI",
          "description": "Generate explicit actions from the model."
        },
        {
          "id": "orchestrator-dialog",
          "label": "Orchestrate ADR review",
          "description": "Read canonical ADRs and plan the audit."
        },
        {
          "id": "task-decomposition",
          "label": "Task decomposition",
          "description": "Split the request into subtasks before acting."
        }
      ]
    }
  }
}
```
