## TASK-0009-loader-min-time-for-form-hasChoices

### Problem
Golden loader contract (see `a2a-client/docs/LOADER-BEHAVIOR.md`) requires:
- Client shows loader immediately after server response when processing
- Loader hide happens only after server response + minimum display time (default `5000ms`)

But `a2a-client/web/js/session-data.js` currently bypasses that minimum delay when the server returns an actionable `form`:
- if `hasForm` and `!execute.wait`, it calls `loader.stop(true)` (force stop) to make inputs appear immediately.

This can hide the loader before `5000ms`, violating the contract.

### Golden invariant
- Minimum loader display time is always enforced (for the corresponding step type).

### Scope (client)
- `a2a-client/web/js/session-data.js` inside `setExecute()`

### Target change
Adjust loader handling for `form` responses so that:
- inputs can render immediately, but
- the loader still cannot be hidden before `MIN_LOADER_MS` expires

### Acceptance criteria
- No simulation fixture changes required.
- Add/adjust a small unit/integration test (if available in this repo) or a runtime guard assertion ensuring `stop(true)` path is not used for form-without-wait.
- Verify loader behavior manually matches `LOADER-BEHAVIOR.md` during:
  - choice form routing (`execute.form.choices`)
  - message sending

