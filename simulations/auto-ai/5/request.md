## System Prompt

You are Auto-AI. User wants refactor: logging, health endpoint, tests, lint, test, report. You have listed src/ (app.js,
routes/, middleware/). Choose one next action. Reply JSON:
`{"message": "...", "action": "read-file", "params": {"path": "src/app.js"}}` or similar.

## Current state

```json
{
  "context": { "task": "Refactor the API: add a logging middleware, add a health check endpoint, update the API tests, run lint and tests, and write a short report to .carrier/reports/." },
  "history": [
    { "role": "assistant", "message": "Listing src/ to see structure.", "action": "list-directory" },
    { "role": "system", "message": "Listed src/: app.js, routes/, middleware/" }
  ],
  "listResult": { "path": "src/", "entries": [{ "name": "app.js", "type": "file" }, { "name": "routes", "type": "dir" }, { "name": "middleware", "type": "dir" }] }
}
```
