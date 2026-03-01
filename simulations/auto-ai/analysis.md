# Auto-AI — workflow

## Steps (full capabilities)

| Step | Request | Response |
|------|---------|----------|
| 1 | task: "add health check and run tests" | actions [auto-ai] |
| 2 | result.action: "auto-ai" | execute.form (message) |
| 3 | result.message: "add health check endpoint and run tests" | LLM → execute.rag-search |
| 4 | result.rag-search (results) | LLM → execute.read-file (e.g. src/app.js) |
| 5 | result.read-file (content) | LLM → execute.write-file (health route code) |
| 6 | result.write-file success | LLM → execute.execute-command ("npm test") |
| 7 | result.execute-command (stdout/stderr) | LLM → completed + summary |

## Capabilities used

- **form** — user message input
- **rag-search** — natural-language code search
- **read-file** — read file by path
- **write-file** — write content to path
- **execute-command** — run shell command (npm test, etc.)
- **completed** — end flow, optional form to continue

## Purpose

Observe how the system behaves when the AI has full power (dialog, RAG, read, write, run commands). Use this simulation to validate orchestration, context handling, and safety/UX with maximum capabilities.
