# `router-rejection/3` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "тест обробки неправильного вибору",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "Тест обробки неправильного вибору"
      },
      {
        "role": "assistant",
        "step": "router",
        "message": "Відхилено: вибрано невалідну опцію 'invalid-choice'"
      },
      {
        "role": "user",
        "message": "valid-choice"
      }
    ]
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "message",
          "type": "textarea",
          "label": "Повідомлення",
          "required": true
        }
      ]
    }
  }
}
```
