# Client simulations

These simulations validate **client** behaviour: given a server response, what the client must send next.

- **Root `simulations/`** — validate **server** responses (server → client).
- **`a2a-client/simulations/`** — validate **client** responses (client → server).

## Two Types of Actions

### Actions (Server-Managed)
Server controls the workflow. Client executes predefined steps sequentially.
- **fix-vue-imports** — form (choice) → script steps (result per step) → finalResult.

### AI-Actions (LLM-Managed)
LLM controls the workflow. Client sends tool results to LLM, which decides next action.
- **dialog** — actions → result.action; then form (message) → result.message.
- **coder** — form (message) → result.message; then execute.rag-search → result.rag-search; execute.read-file → result.read-file; execute.write-file → result.write-file; etc.
- **analyze-dialog** — form with choices (continue_search / save_report) → result.choice + optional result.message / result.path.

## Per-step layout

Each step folder contains:

| File | Description |
|------|-------------|
| `server-response.json` | What the server sends (same as `simulations/<sim>/<step>/response.json`). |
| `client-request.json` | Valid client reply to validate against (same as `simulations/<sim>/<step+1>/request.json`). |

Source of truth: `simulations/` in repo root. Client sims are derived for client-side validation.

## Sims

- **fix-vue-imports** — form (choice) → script steps (result per step) → finalResult.
- **dialog** — actions → result.action; then form (message) → result.message.
- **coder** — form (message) → result.message; then execute.rag-search → result.rag-search; execute.read-file → result.read-file; execute.write-file → result.write-file; etc.
- **analyze-dialog** — form with choices (continue_search / save_report) → result.choice + optional result.message / result.path.
