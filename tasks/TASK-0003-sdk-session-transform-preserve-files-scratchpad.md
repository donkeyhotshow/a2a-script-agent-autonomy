## TASK-0003-sdk-session-transform-preserve-files-scratchpad

### Problem
The golden contract defines canonical context fields that must be preserved between sync steps:
- `context.files` (map of `path -> full content`)
- `context.scratchpad` + `context.scratchpad_ops` (checklist state)

`a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts` updates `context` fields but may not explicitly preserve/merge these canonical fields when applying execute/message/history updates.

### Golden invariant
From `simulations/SCHEMA.md` / `CLIENT-SDK-IDEAL.md`:
- `context.files`, `context.scratchpad`, `context.workbench`, `context.history` are system-managed and should persist when provided by server payloads.

### Scope (SDK/server-side session transform)
- `a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts`

### Target change
Make session transform explicitly preserve/merge:
- `context.files` (do not drop when execute is updated)
- `context.scratchpad` and `context.scratchpad_ops`
- ensure workbench updates do not clobber unrelated workbench sections

### Acceptance criteria
- No fixture changes required.
- Add/adjust a unit test to cover a server response that includes `context.files` and `context.scratchpad` while updating `execute`.

