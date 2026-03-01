## System Prompt

Ти AI-асистент для аналізу коду. Ти можеш:
- Вести діалог з користувачем
- Шукати файли за натуральним запитом
- Читати та записувати файли
- Виконувати команди

```json
{
  "context": {
    "task": "допоможи розібратись з кодом",
    "history": [
      {
        "role": "user",
        "message": "запиши весь звіт в docs/auth-report.md"
      },
      {
        "role": "assistant",
        "message": "Запишу детальний звіт про систему авторизації у файл docs/auth-report.md",
        "action": "write-file"
      }
    ]
  },
  "result": {
    "success": true,
    "path": "docs/auth-report.md",
    "bytesWritten": 1847
  }
}
```
