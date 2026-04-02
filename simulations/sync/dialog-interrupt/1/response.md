# `dialog-interrupt/1` — mirror of `response.json` for drift checks

Fixture mirror (`sim:check-md`), not live model output.

```json
{
  "step": "message-only",
  "message": "Reply while transform carries an interrupt skipped by historyMinLength.",
  "execute": {
    "message": "Reply while transform carries an interrupt skipped by historyMinLength."
  },
  "interrupt": {
    "reason": "clarify",
    "when": {
      "historyMinLength": 5
    }
  },
  "completed": true
}
```
