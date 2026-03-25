## TASK-0006-async-sanitized-execute-and-result-shape

### Problem
Simulations cover sync request/response. Runtime async polling (`promiseId` flow) adds an additional path that must still follow the same shape rules:
- `execute` delivered to Web must be sanitized via `buildWebExecute` (no client-only tool keys)
- `result` delivered to Web must not leak server-only `context` subtrees (and must remain action-key shaped when applicable)

### Golden invariant
From `simulations/SCHEMA.md` + `CLIENT-SDK-IDEAL.md`:
- `received.json` uses Web DTO sanitization (`buildWebExecute`)
- client-only tool keys must be stripped from Web execute payload

### Scope (client routing)
- Vite plugin: `a2a-client/vite-plugin-a2a/routes/stepRoutes.js`
- SDK session API routes: `a2a-client/packages/sdk/src/server/server/routes/sessions.ts`

### Target change
Audit and add defensive checks so that both sync and async responses:
- always pass `promiseStatus.execute` through `buildWebExecute`
- never accidentally forward unsanitized internal tool keys under top-level `execute`

### Acceptance criteria
- No simulation fixture changes required.
- Add a lightweight unit test (or runtime assertion) validating that async polling returns `execute` in Web DTO shape.

