## TASK-0002-sdk-session-transform-completion-shape-align

### Problem
`a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts` currently marks a session as completed based on:
- `serverResponse.execute?.completed === true` or
- `serverResponse.finalResult`

The golden simulation contract (`simulations/SCHEMA.md`) uses:
- `response.json.result.completed === true` (top-level `result` only on final step)

This mismatch risks incorrect runtime status transitions and missing “final” UX state.

### Golden invariant
From `simulations/SCHEMA.md`:
- For final steps: `response.json` may include top-level `result` with `{ completed: true, ... }`
- Intermediate steps should not rely on that same completion signal.

### Scope (SDK/server-side session transform)
- `a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts`
- (if needed) `a2a-client/packages/sdk/src/simulation-helpers.ts` completion helpers

### Target change
Update completion detection to use `serverResponse.result?.completed === true` as the primary signal.

### Acceptance criteria
- No simulation fixture changes required.
- Add/adjust unit tests around session-transform using a response payload that contains `result.completed: true`.
- Confirm that “completed” does not trigger for intermediate steps without `result.completed`.

