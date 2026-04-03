```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": {
      "action": "agent",
      "step": "coder"
    },
    "history": [
      {
        "role": "system",
        "message": "Agent Mode: система використовує RAG для пошуку документації та коду. Перед виконанням дій - шукай релевантні файли."
      },
      {
        "role": "user",
        "message": "додати логінування в API та оновити тести"
      }
    ]
  },
  "result": {
    "message": "додати логінування в API та оновити тести"
  }
}
```