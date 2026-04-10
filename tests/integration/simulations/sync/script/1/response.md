# Step 1 — response (router `execute.form`)

Mirror of `response.json`. Single `execute` key: `form` with stable `choices` ids (`dialog`, `agent`, `fix-vue-imports`).

```json
{
  "context": {
    "task": "Script central E2E (sync/script): router → scope form → script×3 ↔ client → run-script → gate → command → summary → follow-up.",
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
      "title": "Choose pipeline",
      "description": "Central script golden: scripted actions use the same router form class as dialog/agent.",
      "choices": [
        {
          "id": "dialog",
          "label": "Dialog",
          "description": "LLM chat (not exercised in this golden)."
        },
        {
          "id": "agent",
          "label": "Agent",
          "description": "Tool loop (see sync/agent)."
        },
        {
          "id": "task-decomposition",
          "label": "Task decomposition",
          "description": "Split a goal into ordered subtasks (static tail; not exercised here)."
        },
        {
          "id": "fix-vue-imports",
          "label": "Scripted Vue import pipeline",
          "description": "Multi-phase script ↔ client ↔ run-script chain under sync/script."
        },
        {
          "id": "fix-laravel-namespaces-and-uses",
          "label": "Laravel namespaces & use",
          "description": "Scripted PHP namespace cleanup (static tail; not exercised here)."
        }
      ]
    }
  }
}
```
