# Task 33: docVirtual and Task Document Engine (coder-smart & task-decomposition)

## Goal

Implement a unified **virtual document (`context.docVirtual`) and task-document engine** that matches the behavior described in the `coder-smart` and `task-decomposition` simulations:

- Build up a multi-section Markdown task document in memory (`docVirtual`) across several LLM steps.
- Write the final document to `.carrier/tasks/*.md`.
- Drive iterative execution of checklist/actions using that document as the single source of truth.

All behavior must be driven by simulations (pipelines + templates) and protocol, not ad-hoc code.

## Background

From:
- `simulations/coder-smart/description.md`
- `simulations/task-decomposition/description.md`
- `simulations/SCHEMA.md`

we have:

- `context.docVirtual` used to hold:
  - structured task description (sections 1–4 in MD).
  - intermediate state before writing to disk.
- Steps:
  - `coder-smart`: `user-request` → `rag-clarify` → `rag-research-plan` → `checklist` → `write-doc` → `execute-item` loop.
  - `task-decomposition`: `capture-task` → `decompose-subtasks` → `decompose-steps` → `decompose-actions` → `write-doc` → `execute-action` loop.
- Current server code has `task-capture`, `decompose-task`, `write-doc` services/handlers, but there is no explicit `docVirtual` handling or shared engine tying these together in the way simulations describe.

## Requirements

- **1. Define `docVirtual` model and types**
  - Add TypeScript types for `context.docVirtual`:
    - minimal generic shape (`Record<string, unknown>`) plus helpers for known sections (task, subtasks, steps, actions).
  - Document rules:
    - server owns `docVirtual` (client must not mutate it directly),
    - `docVirtual` is part of `context` and flows through the protocol,
    - simulations rely on it for request.md generation.

- **2. Implement a docVirtual service**
  - Create a small service (e.g. `src/services/doc-virtual.service.ts`) with operations:
    - `initFromTaskCapture(...)` – initialize virtual doc from captured/structured task.
    - `mergeFromLLMSection(stepId, llmResult)` – update specific sections (e.g. subtasks, steps, checklist).
    - `toMarkdown()` – render the full document (for `.carrier/tasks/*.md`).
    - `applyChecklistUpdate(...)` – mark checklist items/actions as done and return updated doc.
  - Service must be independent of HTTP; used by:
    - transform pipelines (via `docVirtual` fields),
    - action handlers (`write-doc`, task-decomposition).

- **3. Integrate with coder-smart flow**
  - Ensure the following mapping is possible via pipelines + docVirtual service:
    - `user-request` → `docVirtual.section1` (raw user request).
    - `rag-clarify` → `docVirtual.section2` (clarified task).
    - `rag-research-plan` → `docVirtual.section3` (research plan).
    - `checklist` → `docVirtual.section4` (checklist, with `[ ]` items).
    - `write-doc` → write `docVirtual` to `.carrier/tasks/<id>.md` via `write-doc` handler.
    - `execute-item` loop:
      - request.md built with doc content (`history = [doc]`),
      - LLM returns updated document / updated section,
      - server updates `docVirtual` and writes back to file.
  - Adjust or add `server-transforms-*.json` for coder-smart steps if needed to use `docVirtual` consistently.

- **4. Integrate with task-decomposition flow**
  - Similar mapping:
    - `capture-task` / `decompose-*` actions populate `docVirtual` sections 1–4.
    - `write-doc` writes full doc to `.carrier/tasks/*`.
    - `execute-action` uses the doc as source for the next action to execute; after execution, doc is updated and rewritten.
  - Ensure the task-decomposition services and `decompose-task` handler cooperate with `docVirtual`:
    - either by reading/writing `docVirtual` directly, or by a small adapter layer.

- **5. request.md / response.md alignment**
  - Update prompt templates and/or server transforms so that:
    - For doc-related steps, `request.md` always includes:
      - either `docVirtual` JSON,
      - or the rendered MD (when history is reset to `[doc]`, per spec).
    - `response.md` parsing (via pipelines) updates `docVirtual` consistently.
  - Tests must assert that `request.md` / `response.json` from simulations are reproduced by the runtime engine for coder-smart and task-decomposition steps.

## Acceptance Criteria

- `context.docVirtual` is a first-class, typed part of the server context, with a small service managing its lifecycle.
- coder-smart and task-decomposition simulations can be fully replayed via the new engine:
  - `request.md` generated from runtime equals (or matches normalized) simulation `request.md`.
  - `response.json` generated from runtime equals simulation `response.json`.
- Loops (`execute-item`, `execute-action`) correctly:
  - reset history to `[doc content]` where required,
  - update both `docVirtual` and the on-disk `.carrier/tasks/*.md` file on each iteration.
- No per-simulation ad-hoc `docVirtual` hacks exist in code; all logic goes through the shared service and transform pipelines.

## References

- `simulations/coder-smart/description.md`
- `simulations/task-decomposition/description.md`
- `simulations/SCHEMA.md`
- `docs/new-request-flow/SIMULATION-FORMAT.md`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 33) and logged docVirtual/task-doc engine expectations.
- 📌 Implementation pending; this note will guide the shared-service refinement later.
- 📝 Next steps: implement the service/loop handling and tests after updating `tasks/EXECUTION-LOG.md` for sequential context.
