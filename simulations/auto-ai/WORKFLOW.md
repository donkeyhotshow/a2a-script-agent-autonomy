# Auto-AI — Workflow (extensive case)

See **[ACTIONS-MAP.md](ACTIONS-MAP.md)** for all execute.* / result.* shapes.

## Flow (16 steps)

```
1. task → actions [auto-ai]
2. result.action → execute.form (message)
3. result.message → LLM → execute.rag-search
4. result.rag-search → LLM → execute.list-directory (src/)
5. result.list-directory → LLM → execute.read-file (app.js)
6. result.read-file → LLM → execute.read-file (routes)
7. result.read-file → LLM → execute.write-file (health)
8. result.write-file → LLM → execute.write-file (logging)
9. result.write-file → LLM → execute.grep-search
10. result.grep-search → LLM → execute.read-file (test)
11. result.read-file → LLM → execute.write-file (test)
12. result.write-file → LLM → execute.execute-command (lint)
13. result.execute-command → LLM → execute.execute-command (npm test)
14. result.execute-command → LLM → execute.write-file (report)
15. result.write-file → LLM → completed + form
16. result.message (optional) → completed, form
```

Actions used: form, rag-search, list-directory, read-file (×3), write-file (×4), grep-search, execute-command (×2),
completed.
