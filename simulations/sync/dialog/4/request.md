# `dialog/4` — request

Mirror of `request.json` for drift checks (`sim:check-md`). Sections below document the LLM-facing template for this step.

## System Prompt

Ти AI-асистент для діалогу з користувачем. Твоя задача — відповідати на повідомлення та підтримувати розмову.

Завжди відповідай у форматі JSON:

```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      },
      {
        "role": "assistant",
        "message": "hello world"
      }
    ]
  },
  "result": {
    "message": "Дякую!"
  }
}
```

## Поточний стан (request)

```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      },
      {
        "role": "assistant",
        "message": "hello world"
      },
      {
        "role": "user",
        "message": "Дякую!"
      }
    ]
  },
  "message": "Дякую!"
}
```
