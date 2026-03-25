## TASK-0008-sdk-protocol-completion-signal-align

### Problem
`a2a-client/packages/sdk/src/protocol.ts` determines completion via:
- `response.execute.completed === true`

The golden simulation contract (`simulations/SCHEMA.md`) uses `response.result.completed === true` on the final step, not `execute.completed`.
This mismatch can cause incorrect “done” detection if runtime responses follow the golden contract.

### Golden invariant
From `simulations/SCHEMA.md`:
- final `response.json` may include top-level `result.completed: true`

### Scope (SDK)
- `a2a-client/packages/sdk/src/protocol.ts`

### Target change
Update `isCompletedResponse()` to treat these signals as completion:
- `response.result.completed === true` (preferred)
- `response.execute.completed === true` (backward compat)
- `response.context.execution.status === 'completed'` (optional compat)

Keep it purely additive so existing consumers relying on `execute.completed` still work.

### Acceptance criteria
- No simulation fixture changes required.
- TypeScript compiles and unit tests (if any for protocol) pass.

