# `form-validation-error/1` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "форма з помилкою валідації",
    "execution": {
      "action": "dialog",
      "step": "request"
    }
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "age",
          "type": "number",
          "label": "Вік",
          "required": true,
          "placeholder": "Введіть число від 1 до 10"
        }
      ]
    }
  }
}
```
