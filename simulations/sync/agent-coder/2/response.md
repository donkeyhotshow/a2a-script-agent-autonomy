# `agent-coder/2` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "допоможи розібратись з кодом",
    "execution": {
      "action": "agent",
      "step": "2"
    },
    "history": []
  },
  "execute": {
    "form": {
      "title": "Ваш запит",
      "description": "Опишіть питання або зміни в коді; далі Coder використає RAG і роботу з файлами.",
      "input": [
        {
          "name": "task",
          "type": "text",
          "label": "Повідомлення",
          "required": true
        }
      ]
    }
  }
}
```
