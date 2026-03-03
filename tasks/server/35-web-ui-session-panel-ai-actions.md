# Task 35: Web UI session panel alignment for AI-Actions and simulations

## Goal

Align the **Web UI (a2a-client/web)** session panels and flows with the canonical session protocol and simulations, so that:

- SessionPanel behavior matches `SESSION-FLOW.md` (PENDING → READY → IN_PROGRESS → WAITING_CONFIRMATION → COMPLETED).
- AI-Actions flows (`dialog`, `coder`, `auto-ai`, `analyze`, `coder-smart`, `task-decomposition`) are fully supported in the UI:
  - `execute.form` (choices + inputs),
  - `execute.message`,
  - multi-step exec with `execute.*` actions.
- The UI can be driven directly from `response.json` shapes used in simulations.

## Background

From:
- `docs/new-request-flow/WEB-UI.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md` and individual simulation descriptions

we have:

- Canonical **SessionPanel** behavior, including:
  - separate states, draggable/minimizable panels, visual step progress, final result rendering.
- Clear Web → Client API endpoint contracts (`/api/sessions/*`).
- Simulations describing AI-Actions flows, including forms and messages that should appear in the UI.
Currently, web JS modules (`session-manager.js`, `task-flow.js`, `plasticine-ui.js`, `floating-panel.js`, etc.) only partially implement the new protocol and session flow.

## Requirements

- **1. SessionPanel state model and data binding**
  - Define a single **session view-model** in web JS (e.g. within `session-manager.js` / `plasticine-workflow.js`) that:
    - directly mirrors the Client API’s session shape (see `SESSION-FLOW.md` example JSON).
    - exposes derived UI state:
      - current step list with status,
      - canContinue / canAuto / canStop flags,
      - active `execute` commands (form, message, client actions).
  - Ensure SessionPanel rendering uses only this view-model, not bespoke state scattered across modules.

- **2. Proper handling of execute.form / execute.message**
  - Implement robust form rendering for:
    - **First response** with `execute.form.choices` (action selection).
    - Subsequent steps where `execute.form.input` is used (AI-Actions dialog, confirmation prompts).
  - Implement display for `execute.message` in the panel, matching simulation expectations (e.g. dialog responses, summary messages).
  - Ensure UI posts back:
    - `result.choice` for choices,
    - `result.message` and/or other structured form inputs for text fields, etc.

- **3. Multi-step step list and progress**
  - Extend UI to render step lists for Actions and AI-Actions, using:
    - `context.execution` (current action + step),
    - optionally server-provided `steps` metadata where present.
  - Match visuals from `SESSION-FLOW.md`:
    - mark completed steps with ✓,
    - highlight current step,
    - show per-step outputs in a dedicated area.

- **4. Manual vs Auto modes**
  - Implement the buttons and flows:
    - Manual: POST `/api/sessions/:id/next { mode: "manual" }`.
    - Auto: POST `/api/sessions/:id/next { mode: "auto" }`, with visual “auto-running” state and Stop/Cancel handling.
  - Use SSE or polling (via `SSEClient` / Client API) to update SessionPanel during longer runs, in sync with:
    - promise-based server flows (`/api/v1/requests/*`),
    - progress events from Client API if available.

- **5. Simulation-driven UI tests / stories**
  - Create a small set of **fixture-driven UI scenarios** (for example, using static `response.json` from simulations) that:
    - feed SessionPanel/rendering code with recorded server responses,
    - assert DOM structure / behavior for:
      - `dialog` first form, dialog steps,
      - `coder` with RAG + file operations,
      - `auto-ai` multi-action flow (form, rag-search, list-directory, execute-command, write-file),
      - `task-decomposition` / `coder-smart` doc-related flows.
  - Optionally expose these as dev-only pages under `a2a-client/web/examples/` for manual inspection.

## Acceptance Criteria

- Web UI SessionPanel:
  - correctly renders canonical `response.json` from simulations for at least `dialog`, `coder`, and `auto-ai`,
  - supports selecting actions from `execute.form.choices`,
  - shows and updates per-step progress and results,
  - differentiates manual vs auto modes as described in `SESSION-FLOW.md`.
- No legacy protocol fields (`actions[]`, etc.) are required for new flows; UI is fully driven by `context` + `execute` + top-level `result`.

## References

- `docs/new-request-flow/WEB-UI.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `docs/new-request-flow/PROTOCOL.md`
- `a2a-client/web/js/session-manager.js`
- `a2a-client/web/js/task-flow.js`
- `a2a-client/web/js/plasticine-workflow.js`
- `simulations/SCHEMA.md`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 35) and captured the UI requirements for session panel.
- 📌 Implementation work is pending; this note documents what must be covered by UI updates.
- 📝 Next steps: tie simulation responses to the UI session panel once the execution log is updated (`tasks/EXECUTION-LOG.md`).
