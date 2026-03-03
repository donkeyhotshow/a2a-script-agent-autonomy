# Client Task 09: Web – Errors, progress, and UX consistency

## Goal

Unify **error handling**, **progress indication**, and **accessibility/UX** across a2a-client/web so that:

- All Client API and session errors are handled in one place and shown consistently.
- Progress (manual/auto steps, promiseId polling) is visible and cancellable.
- Session panels and forms are accessible and consistent with SESSION-FLOW.md and PROTOCOL.

## Scope

- `a2a-client/web/js/` (error-handler, progress-indicators, sse-client, session-manager, task-flow, ui-components)
- `a2a-client/web/css/` (errors, progress, session-manager, forms)

## Requirements

- **1. Centralized API/session errors**
  - Route all fetch errors and Client API error responses through `ErrorHandler` (or a single error bus).
  - Map HTTP status and body to user-facing messages (e.g. "Session not found", "Request timed out", "Server unavailable").
  - Show errors in the session panel context when possible (e.g. "Step failed: …") and in a global notification area.
  - Avoid silent failures; log and display a minimal message for network/parse errors.

- **2. Progress and loading states**
  - When waiting for Client API (e.g. after POST `/api/sessions/:id/next`):
    - show a loading state on the session panel (e.g. spinner or "Running…"),
    - disable "Далее" / "Авто" until response is back or timeout.
  - When Client API is polling server (promiseId flow):
    - show "Waiting for result…" or progress from SSE/polling if Client API provides it.
  - "Стоп" / "Отменить" must cancel the in-flight request or polling and update UI (e.g. back to "Далее" or show "Cancelled").

- **3. Forms and validation**
  - Validate required fields on `execute.form.input` before sending (e.g. `result.message` not empty when required).
  - Show inline validation errors; do not submit invalid form.
  - After submit, clear or disable form until next `execute` is received.

- **4. Accessibility and consistency**
  - Session panel and dialog: ensure focus management (e.g. focus on new message or input when step completes).
  - Buttons and links: keyboard accessible, clear labels (e.g. "Next step", "Cancel").
  - Optional: run a basic a11y check (e.g. axe or lighthouse) and fix critical issues in session flow and forms.
  - Consistent styling for states: pending, in progress, completed, error (reuse existing progress/session-manager CSS).

- **5. Documentation**
  - Update WEB-UI.md with: how errors are shown, how progress works, and where to extend (ErrorHandler, progress-indicators, session-manager events).

## Acceptance criteria

- All Client API errors are handled and displayed; no uncaught fetch rejections in normal flow.
- Progress and loading states are visible during next step and during promiseId polling.
- Form validation prevents invalid submit; cancel/stop works and updates UI.
- Session panel and key flows are keyboard-accessible and have consistent UX.

## References

- `docs/new-request-flow/WEB-UI.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `a2a-client/web/js/error-handler.js`
- `a2a-client/web/js/progress-indicators.js`
- `a2a-client/web/js/session-manager.js`
- `a2a-client/web/js/task-flow.js`
