# Client simulation schema

Use these fixtures to validate that the client sends the correct payload after each server response.

## Two Types of Actions

There are two fundamentally different types of actions in the A2A protocol:

### Actions (Server-Managed)

In **Actions** mode, the **server controls the workflow** by sending a predefined sequence of steps. The client simply
executes each step and returns results.

- Server sends `actions[]` array with step definitions
- Server sends `execute` tasks with explicit instructions
- Client cannot skip or reorder steps
- Used for: Fixed workflows, forms with predefined choices, scripts with known steps

**Client behavior:**

- Receives `actions[]` from server
- Executes each action sequentially
- Returns `result` for each completed action
- Does not make autonomous decisions about next steps

### AI-Actions (LLM-Managed)

In **AI-Actions** mode, the **LLM controls the workflow**. The server provides tools/capabilities, but the LLM decides
which tools to call and in what order.

- Server sends `capabilities` or `availableTools`
- Client executes tools and sends results back to LLM
- LLM decides next action based on results
- Used for: Dialog with RAG, code editing, complex analysis tasks

**Client behavior:**

- Receives tool execution results from server
- Sends results to LLM for decision-making
- LLM determines next tool to call
- Continues until task is complete

## Rules

1. **Echo context** — client always sends back the `context` from the last server response (unchanged).
2. **Form with choices** — client sends `result.choice` (id of selected option). Optional: `result.message`,
   `result.path` if form has those inputs.
3. **Form with message only** — client sends `result.message`.
4. **execute.script** — client runs script, then sends `result` with the output shape (e.g. `result.broken_imports`,
   `result.patches`, `result.fixed_files`).
5. **execute["read-file"]** — client sends `result["read-file"]`: `{ "path", "content" }`.
6. **execute["rag-search"]** — client sends `result["rag-search"]`: `{ "results": [...], "files": [...] }`.
7. **execute["write-file"]** — client writes file, then sends e.g. `result["write-file"]`: `{ "path", "ok": true }` or
   similar.

When server sent `actions[]` (legacy), client sends `result.action`. When server sent `execute.form` with choices,
client sends `result.choice`.
