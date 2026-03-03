# Task 32: Simulation Actions Map Alignment

## Goal

Align all **execute / result action types** used in simulations (especially `auto-ai`, `coder`, `dialog`, `analyze`, `coder-smart`, `task-decomposition`) with actual server action handlers and registry, so that every action key appearing in `simulations/*/response.json` has a well-defined, tested implementation on the server.

## Background

From:
- `simulations/SCHEMA.md`
- `simulations/auto-ai/ACTIONS-MAP.md`
- individual `description.md` files (dialog, coder, auto-ai, analyze, coder-smart, task-decomposition)

the following **execute action types** are used:

- Core:
  - `form`, `message`
  - `rag-search`
  - `read-file`, `write-file`
  - `execute-command`
  - `list-directory`
  - `script`
- Extended / simulation-specific:
  - `grep-search`
  - `capture-task` (+ related task-capture actions)
  - `write-doc`, `read-doc`, `append-doc`, `generate-doc`, `generate-report`
  - task-decomposition actions (`decompose-subtasks`, `decompose-steps`, `decompose-actions`, `execute-action`, etc., often encoded via `decompose-task` and task services)

Server already has handlers for many of these (`file-operations`, `rag-search`, `command-execution`, `capture-task`, `decompose-task`, `write-doc`), but there is no single **canonical mapping** from simulation action keys to handler functions, and at least one action (`grep-search`) has no dedicated handler.

## Requirements

- **1. Build canonical actions map from simulations**
  - Scan `simulations/**/response.json` and `ACTIONS-MAP.md` to extract:
    - all top-level keys under `execute` (`"form"`, `"rag-search"`, `"write-file"`, `"grep-search"`, etc.),
    - all top-level keys under `result` that follow action-key shape.
  - Produce a machine-readable summary (e.g. JSON or TS) listing:
    - `actionType` (string),
    - `usedInSimulations` (list of simulation names),
    - `direction` (`execute`, `result`, or both).

- **2. Define server-side action registry mapping**
  - Introduce (or extend) a central action registry config in `a2a-server` that maps:
    - simulation / protocol action key → handler module + exported function.
  - Ensure all **core** actions used in sims are covered:
    - `form`, `message` (UI-only; server just passes them through but they must be allowed and validated),
    - `rag-search` → `executeRagSearch`,
    - `read-file`, `write-file`, `list-directory`, `file-exists` → `file-operations` handlers,
    - `execute-command` → `command-execution` handler,
    - `script` → script-engine / client-side executor (server only emits).

- **3. Implement missing `grep-search` handler**
  - Add a dedicated action handler for `grep-search`:
    - Use a safe implementation (prefer ripgrep / Node-level search over arbitrary `grep` commands).
    - Return structured matches (`file`, `line`, `snippet`, `matchCount`) aligned with what `auto-ai` simulations expect.
  - Wire `grep-search` into the action registry and protocol types if needed.

- **4. Wire task / document actions used in simulations**
  - Ensure that simulation-level actions are mapped:
    - `capture-task` → `executeCaptureTask` (task capture service).
    - Task-decomposition actions (`decompose-subtasks`, `decompose-steps`, `decompose-actions`, `execute-action`) → the corresponding functions in `decompose-task` / task-decomposition services (either via direct naming or via a small adapter layer).
    - `write-doc` / `generate-doc` / `generate-report` used in `coder-smart` and `task-decomposition` → `write-doc` handlers.
  - Make the mapping explicit in config rather than implicit in scattered code.

- **5. Validation and tests**
  - Add tests that:
    - Iterate over the canonical actions map derived from simulations.
    - Assert that each action key is:
      - either explicitly mapped to a handler (for client-executed actions), or
      - explicitly allowed as UI-only type (`message`, `form`) and passes protocol validation.
    - Fail when a new action is introduced in simulations without a corresponding mapping.

## Acceptance Criteria

- A single **actions map definition** exists in `a2a-server` that:
  - lists all action keys used in simulations,
  - maps each to a handler or marks it UI-only.
- `grep-search` has a production-ready handler and is wired to the protocol/action registry.
- All simulations’ `execute` / `result` action keys are covered by the map; tests fail if coverage drops.
- No ad-hoc action-type strings remain hardcoded outside the registry/mapping.

## References

- `simulations/SCHEMA.md`
- `simulations/auto-ai/ACTIONS-MAP.md`
- `simulations/*/description.md`
- `a2a-server/src/actions/handlers/*.ts`
- `docs/new-request-flow/PROTOCOL.md`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 32) while cataloguing the required action map alignment.
- 📌 Implementation pending; this note keeps the synchronization requirements visible.
- 📝 Next steps: formalize the actions map coverage checks once the implementation phase begins (see `tasks/EXECUTION-LOG.md`).
