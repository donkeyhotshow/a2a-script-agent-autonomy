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
| **Black Room** | Черная комната: финальная фаза обработки, где формируется окончательный ответ клиенту после выполнения всех операций |
| **Gray Room** | Серая комната: серверная цепочка LLM-вызовов (compress_history, thinking, auto_rag_page, auto_read_file, clarify) перед возвратом клиенту |
| **Red Room** | Красная комната: фаза выполнения инструментов клиентом (read-file, list-directory, file-exists и т.д.) после принятия решения в Gray Room |
| **Self-Upgrade** | Самоапгрейд: процесс самоулучшения системы, включающий либо автоматический запуск скрипта монитора задач (`monitor-and-process-tasks.js`), либо ручной диалог через API с агентом для анализа и улучшения системы. Система a2a-client разработана для работы с проектом a2a-script-agent, создавая самореферентный цикл. Все документы состояния и рабочих процессов должны упоминать, что система должна выполнять самоапгрейд |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync Mode** | Immediate execute response (no promiseId) |
| **Web DTO** | Client-sanitized execute (form only, not raw tool calls) |
