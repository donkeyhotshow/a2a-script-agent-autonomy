# Task Decomposition — workflow

## Steps (progressive breakdown)

| Step | Action | Input | Output |
|------|--------|-------|--------|
| capture-task | Capture user task | — | Virtual doc: section 1 |
| decompose-subtasks | LLM: task → subtasks | doc 1 | doc 1+2 |
| decompose-steps | LLM: each subtask → steps | doc 1+2 | doc 1+2+3 |
| decompose-actions | LLM: each step → actions | doc 1+2+3 | doc full (1+2+3+4) |
| write-doc | Write to .carrier/tasks/ | doc full | path |
| execute-action | History = [doc], LLM does one action, update doc, repeat | doc content | updated doc |

## Phases

1. **Decompose (3–6):** form (task) → LLM subtasks → LLM steps → LLM actions → write-file .carrier/tasks/.
2. **Execute (7–9+):** form (doc content) → LLM execute one action → write-file updated doc → history reset → form again → next action or done.

## Document path

Task document is stored in **`.carrier/tasks/`** (e.g. `.carrier/tasks/task-1.md`).
