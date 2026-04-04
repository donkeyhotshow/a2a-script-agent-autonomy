# `orchestrator-dialog/2` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

```json
{
  "context": {
    "task": "orchestrate ADR review",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "orchestrator-dialog",
      "step": "gather-goal"
    }
  },
  "execute": {
    "form": {
      "title": "Describe the coordination job",
      "input": [
        {
          "name": "task",
          "type": "textarea",
          "label": "What exactly should I orchestrate?",
          "required": true,
          "placeholder": "Read ADR-0027 and outline how to check documentation."
        }
      ]
    }
  }
}
```
