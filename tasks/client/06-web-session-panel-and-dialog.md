# Client Task 06: Web – Session panel and dialog (execute.form, execute.message, messages[])

## Goal

Implement and align **a2a-client/web** SessionPanel and dialog so that:

- The UI is driven solely by data from **Client API** (`/api/sessions/*`): `context`, `execute`, and the derived **messages[]** list for the chat.
- `execute.form` (choices + inputs) and `execute.message` are rendered correctly and user replies are sent as `result.choice` / `result.message`.

## Scope

- `a2a-client/web/` (JS, CSS, templates)
- Integration with Client API responses only (no direct server calls)

## Requirements

- **1. Single session view-model**
  - In `session-manager.js` (or a dedicated `session-view-model.js`), maintain one structure per session that mirrors Client API session DTO:
    - `id`, `status`, `context` (task, execution),
    - `messages[]` (from Client API – used for dialog display),
    - `execute` (current form/message/client actions),
    - `canContinue`, `canAuto`, `canStop` (or equivalent from API).
  - All SessionPanel rendering (panel-cube, plasticine-workflow, etc.) must read from this view-model; no duplicate state.

- **2. Dialog display from messages[]**
  - Render the session dialog using **only** `messages[]`:
    - each entry: `role` (user | assistant | system), `text`, optional `stepIndex`/`source`.
  - Do **not** build chat history from legacy fields; ensure Client API provides `messages[]` (Task 37) and Web consumes it.

- **3. execute.form handling**
  - **First response (action choice):**
    - When `execute.form.choices` is present, render a list of options (id + label).
    - On user click, send to Client API: `result.choice` = selected `id` (e.g. POST `/api/sessions/:id/action` or `/next` with choice).
  - **Follow-up (text input / confirm):**
    - When `execute.form.input` is present, render inputs (text, etc.) and submit as `result.message` and/or structured form values.
  - Use protocol action-key shape; no `actions[]` or legacy form fields.

- **4. execute.message display**
  - When server sends `execute.message`, show it in the session panel as the next assistant message (or append to `messages[]` after Client API updates session).
  - Ensure ordering: user message → assistant message (from execute.message) → form for next input.

- **5. Manual / Auto and progress**
  - Buttons "Далее" / "Авто" / "Стоп" / "Отменить" call Client API only:
    - POST `/api/sessions/:id/next` with `mode: "manual"` or `mode: "auto"`.
    - POST `/api/sessions/:id/cancel` for cancel.
  - Show step list and progress from `context.execution` and any step metadata returned by Client API; show per-step output in a dedicated area.

## Acceptance criteria

- SessionPanel displays dialog using only `messages[]` and current `execute`.
- All forms (choices + inputs) post back `result.choice` or `result.message` (and other fields) in protocol shape.
- No direct calls to a2a-server from Web; all traffic goes through Client API.
- UI matches behavior described in `SESSION-FLOW.md` for at least `dialog`, `coder`, `auto-ai`-style flows.

## References

- `docs/new-request-flow/WEB-UI.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `docs/new-request-flow/PROTOCOL.md`
- `a2a-client/web/js/session-manager.js`
- `a2a-client/web/js/task-flow.js`
- `a2a-client/web/js/plasticine-workflow.js`
- Task 37 (session log and messages[])
