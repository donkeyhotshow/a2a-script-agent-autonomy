## TASK-0007-web-taskflow-render-client-action-key-determinism

### Problem
`a2a-client/web/js/task-flow/render.js` renders client actions using:
- `Object.keys(execute)[0]`

If `execute` ever contains more than one client-action key (or key ordering changes), UI routing becomes non-deterministic and can drift away from the golden “single action key” expectation.

### Golden invariant
From `simulations/SCHEMA.md` / `CLIENT-SDK-IDEAL.md`:
- `execute` must represent the active command as a single canonical action.

### Scope (client)
- `a2a-client/web/js/task-flow/render.js`

### Target change
Replace `Object.keys(execute)[0]` with deterministic selection:
- Define an ordered priority list for internal client action keys (`script`, `rag-search`, `read-file`, …).
- Pick the first key that exists on `execute`.
- If more than one internal key exists, prefer the highest-priority one and `console.warn` (or fall back to debug rendering).

### Acceptance criteria
- No simulation fixture changes.
- Client UI does not crash when multiple keys are present.

