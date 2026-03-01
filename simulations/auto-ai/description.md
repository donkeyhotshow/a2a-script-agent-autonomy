# Auto-AI Simulation

## Description

Final simulation: **full agent capabilities**. Auto-AI can use every facility the agent supports:

- **Dialog** — form (message input), multi-turn conversation
- **RAG search** — natural-language search over codebase (@a2a/rag: BM25, semantic, hybrid)
- **Read file** — read file contents by path
- **Write file** — create or update files (reports, code, docs)
- **Execute command** — run shell/console commands (e.g. `npm test`, `npm run build`, scripts)

Style follows **coder-dialog**, **coder-smart**, **dialog**, **analyze-dialog**: description, analysis, numbered steps with request/response JSON and optional server-transforms + request.md/response.md where LLM is involved.

## Use case (true end-to-end)

User task: *"Add a health check endpoint and run the test suite."*

Flow:

1. User selects auto-ai → form asks for message.
2. User sends message → LLM decides to search codebase (RAG).
3. Client returns RAG results → LLM asks to read a specific file (e.g. routes or app entry).
4. Client returns file content → LLM explains and proposes to add health route + write file.
5. Server returns `execute.write-file` → client writes file.
6. Client sends write success → LLM proposes running tests → `execute.execute-command` (e.g. `npm test`).
7. Client runs command, returns stdout/stderr → LLM summarizes and completes.

Thus the simulation exercises: **form**, **rag-search**, **read-file**, **write-file**, **execute-command**, **completed**.

## File structure

```
simulations/auto-ai/
├── description.md
├── analysis.md
├── 1/ request.json, response.json
├── 2/ request.json, response.json
├── 3/ request.json, response.json (+ optional request.md, response.md, server-transforms)
├── 4/ request.json, server-transforms-request.md, request.md, response.md, server-transforms-response.md, response.json
├── 5/ request.json, ... (read-file result → LLM → write-file)
├── 6/ request.json, response.json  (write-file success)
├── 7/ request.json, ... (execute-command)
├── 8/ request.json, response.json  (command result → completed)
├── 8/ request.json, response.json  (optional: user says "thanks" after completed → form again)
└── 9/ (optional) further turns
```

## Rules

- **Context**: server controls context; client does not add to it.
- **Result**: client result is outside context.
- **LLM-controlled flow**: LLM chooses next action (rag-search, read-file, write-file, execute-command, continue, completed).
- **Execute payloads**: `execute.form`, `execute.rag-search`, `execute.read-file`, `execute.write-file`, `execute.execute-command`.
