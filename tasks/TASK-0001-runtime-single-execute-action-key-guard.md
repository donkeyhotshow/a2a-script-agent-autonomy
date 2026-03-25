## TASK-0001-runtime-single-execute-action-key-guard

### Problem
The client SDK dispatch code assumes `execute` is in **action-key shape** and uses `Object.keys(execute)[0]`. If multiple keys appear, dispatch becomes non-deterministic and can drift away from the golden contract (“exactly one action key under `execute` for the active command”).

### Golden invariant
From `simulations/SCHEMA.md` / `CLIENT-SDK-IDEAL.md`:
- Under `response.json.execute`, the active command must be represented by **exactly one** action key.

### Scope (client)
- `a2a-client/packages/sdk/src/action-handler.ts`

### Target change
Add a runtime guard in `extractExecuteAction()` (and/or in the dispatch entrypoint) that:
- checks `Object.keys(execute).length`
- returns `{ handled: false, error: ... }` if it is not exactly `1`

### Acceptance criteria
- No simulation fixture changes required.
- Unit coverage (preferred): add/extend a unit test that passes `execute` with 0 keys and with 2 keys and asserts a safe failure.
- Existing behavior remains unchanged for valid single-key `execute`.

