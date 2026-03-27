# A2A Script Agent Glossary

| Term | Definition |
|------|-----------|
| **A2A (Agent-to-Agent)** | Protocol linking specialized agents through unified request/response structure and shared context |
| **Agent** | Autonomous component executing specific task (code analysis, proxying, testing, etc.) |
| **Session** | Logical chain of operations/messages between client and server; stores `context`, `execute`, `messages`, `stepNum` |
| **Promise/promiseId** | Async request identifier for polling status/result via `/api/v1/requests/{promiseId}/result` |
| **Action/Execute/Result** | Structured objects: `execute` from server (form/action/message), client responds `result`, action specifies operation |
| **Step storage** | Step folders in `a2a-client/storage/sessions/{sessionId}/{step}/` with `request-to-server.json`, `server-response.json`, `server-promise.json`, `messages.json` |
| **Auto mode** | Behavior when `execute` requires no user input (no form.input/form.choices); UI creates system messages and can continue automatically |
| **Workbench** | Structured state in `context.workbench.sections` |
| **Action-Key Shape** | Single action type per execute/result: `{ "execute": { "script": {...} } }` |
| **Gray Room** | Server-side interrupt loop after response transform |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync Mode** | Immediate execute response (no promiseId) |
| **Web DTO** | Client-sanitized execute (form only, not raw tool calls) |
