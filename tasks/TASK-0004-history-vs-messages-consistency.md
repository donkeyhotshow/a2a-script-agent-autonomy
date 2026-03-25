## TASK-0004-history-vs-messages-consistency

### Problem
The golden contract treats `context.history` as the system-managed chat/tool summary list, while some SDK runtime code also maintains a separate `session.messages` array.

Drift between these two sources can cause UI inconsistencies and makes protocol compliance harder to reason about.

### Golden invariant
From `simulations/SCHEMA.md`:
- `context.history` is canonical for tool/user/assistant summary entries (system-managed).

### Scope (SDK/client)
- `a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts`
- (if used elsewhere) any session merge logic that duplicates assistant messages into `session.messages`

### Target change
Make the runtime update logic consistent with the golden model:
- prefer appending assistant turn into `context.history` when `serverResponse.context.history` is present
- ensure any `session.messages` derived from `execute.message` does not contradict `context.history`

### Acceptance criteria
- Unit test covering the transition where the server payload provides `context.history` and `execute.message`.
- No simulation fixture changes required.

