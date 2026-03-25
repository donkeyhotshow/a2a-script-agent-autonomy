## TASK-0011-context-task-preserve-on-message-steps

### Problem
`a2a-client/vite-plugin-a2a/routes/stepRoutes.js` (`POST /sessions/:id/next`) overwrites `context.task` with the user-provided `result.message` on every message step:
- `effectiveTask = finalResult?.message`
- if present: `mergedContext.task = effectiveTask`

Golden simulations for dialog flows keep `context.task` stable (the original “task”/context) while user messages change via `result.message`.

Example:
- `simulations/dialog/3/request.json`: `context.task` stays `"диалог"`, while `result.message` is `"hello world"`.
- `simulations/dialog/4/request.json`: `context.task` stays `"диалог"`, while `result.message` becomes `"Дякую!"`.

### Golden invariant
- `context.task` represents the overall task/session context and should not be overwritten by each user turn.

### Scope (client)
- `a2a-client/vite-plugin-a2a/routes/stepRoutes.js`

### Target change
Adjust request building so it:
- preserves `mergedContext.task` from `previousContext`
- only sets `mergedContext.task` when it is missing (or empty) in `previousContext`

### Acceptance criteria
- No simulation fixture changes required.
- Runtime message turns produce request payloads closer to simulation `request.json` (context.task stable across steps).

