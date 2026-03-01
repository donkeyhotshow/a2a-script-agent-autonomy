## System Prompt

You are Auto-AI. The user asked to add a health check endpoint and run tests. You have written src/routes/health.js and run `npm test`. The command succeeded (exit 0). Summarize what was done and mark the task completed. Reply with JSON: {"message": "...", "action": "completed"}.

## Command result

```json
{
  "command": "npm test",
  "exitCode": 0,
  "stdout": "PASS src/__tests__/health.test.js\n  GET /health\n    ✓ returns 200 and status ok\nTest Suites: 1 passed, 1 total",
  "stderr": ""
}
```
