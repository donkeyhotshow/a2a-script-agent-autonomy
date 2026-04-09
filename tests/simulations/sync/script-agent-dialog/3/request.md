# Step 3 — request (LLM processes user error message)

This step calls the LLM to analyze the import error and decide how to respond.

```json
{
  "context": {
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "message": "При запуске dev-сервера вылетает ошибка Cannot find module @/components/Missing из resources/js/components/Example.vue."
  }
}
```

## System Prompt

You are a Vue.js expert assistant. When the user reports import errors, you should:
1. Acknowledge the error and explain what went wrong
2. Suggest the best fix approach

## Response Format

```json
{
  "context": {
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "При запуске dev-сервера вылетает ошибка Cannot find module @/components/Missing из resources/js/components/Example.vue."
      }
    ]
  },
  "result": {
    "message": "Сообщение от ассистента"
  }
}
```

## Current State

```json
{
  "context": {
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "message": "При запуске dev-сервера вылетает ошибка Cannot find module @/components/Missing из resources/js/components/Example.vue.",
        "role": "user"
      }
    ],
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "message": "При запуске dev-сервера вылетает ошибка Cannot find module @/components/Missing из resources/js/components/Example.vue."
  },
  "workbench": null,
  "ragResults": null
}
```

## Constraints

- Always respond with valid JSON.
- The response should include a `message` explaining the error and offering help.
- Do not fabricate file contents — you don't have access to the file system in this simulation.
- If you want to trigger the auto-fix script, include `execute` with `form` that lets the user confirm.
