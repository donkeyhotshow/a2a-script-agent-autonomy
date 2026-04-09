# Task Decomposition Simulation

## Description

Progressive breakdown via LLM: capture task → decompose into subtasks → decompose each subtask into steps → decompose
each step into actions. Document is built stepwise (virtually), then optionally written to `.carrier/tasks/` and
executed.

## Task document format (MD)

File in **`.carrier/tasks/<id>.md`** (or equivalent):

```markdown
# 1. Task

<original user task>

# 2. Subtasks

- Subtask 1
- Subtask 2

# 3. Steps (per subtask)

## Subtask 1
- Step 1.1
- Step 1.2
## Subtask 2
- Step 2.1

# 4. Actions (per step)

## Step 1.1
- [ ] Action 1.1.1
- [ ] Action 1.1.2
## Step 1.2
- [ ] Action 1.2.1
```

## Step sequence

1. **capture-task** — capture user task (virtual doc: section 1 only).
2. **decompose-subtasks** — LLM: from task produce subtasks. Virtual doc: sections 1 + 2.
3. **decompose-steps** — LLM: for each subtask produce steps. Virtual doc: sections 1 + 2 + 3.
4. **decompose-actions** — LLM: for each step produce actions. Virtual doc: full (1 + 2 + 3 + 4).
5. **write-doc** — write document to **`.carrier/tasks/`**.
6. **execute-action** — loop: history = [doc], LLM executes first pending action; update doc; repeat until done.

## Rules

- Dialog via **execute.form** (message) and **result.message**.
- Before write, document sections live in `context.workbench.sections`.
- After write, each iteration: history = [doc content], LLM returns result + updatedTaskDoc, client updates file.

## Simulation file structure

```
simulations/task-decomposition/
├── description.md
├── analysis.md
├── 1/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 2/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 3/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 4/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 5/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 6/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 7/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 8/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
└── 9/
    ├── client.json
    ├── request.json
    ├── response.json
    └── received.json
```
