# Auto-AI Simulation — Workflow

## File types (same as coder-dialog / dialog)

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | Payload from client |
| `server-transforms-request.md` | — | How server builds LLM input. Optional. |
| `request.md` | Server → LLM | Prompt + context (markdown) |
| `response.md` | LLM → Server | LLM reply |
| `server-transforms-response.md` | — | How server builds client payload. Optional. |
| `response.json` | Server → Client | execute.* and/or result |

Steps without LLM: only `request.json` and `response.json`.

## Flow (true case)

```
1. task → actions [auto-ai]
2. result.action: auto-ai → execute.form (message)
3. result.message → LLM → execute.rag-search
4. result.rag-search → LLM → execute.read-file
5. result.read-file → LLM → execute.write-file
6. result.write-file → LLM → execute.execute-command (npm test)
7. result.execute-command → LLM → completed + form
8. (optional) result.message "thanks" → completed, form again
```

## Capabilities exercised

- **form** — user message
- **rag-search** — natural-language code search
- **read-file** — read file by path
- **write-file** — write content to path
- **execute-command** — run shell command (e.g. npm test)
- **completed** — task done, optional continue form

## Purpose

Validate system behavior when the AI has full capabilities (dialog, RAG, read, write, run commands). Use this simulation to test orchestration, context, and safety/UX.
