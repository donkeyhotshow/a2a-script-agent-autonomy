## TASK-0010-next-context-execution-signal-consistency

### Problem
There are multiple “next step” entrypoints in this repo, and they currently diverge in how they set `context.execution` for `POST .../next`.

Observed divergence:
- SDK/server route `a2a-client/packages/sdk/src/server/server/routes/sessions.ts` sets:
  - `context.execution = { action: 'continue', step: 'next' }`
- Vite-plugin web route `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` builds `requestToServer` by merging prior context and does not hardcode `{action:'continue', step:'next'}`.

Golden simulations depend on `context.execution.action/step` to drive transforms and step routing, so inconsistent client-side context shaping can cause runtime drift.

### Golden invariant
`context.execution.action` and `context.execution.step` must match the expected contract for the subsequent pipeline step (as reflected in `simulations/*/request.json`).

### Scope
- `a2a-client/packages/sdk/src/server/server/routes/sessions.ts` (POST `/api/sessions/:sessionId/next`)
- `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` (POST `/api/a2a/sessions/:id/next`)

### Target change
Update SDK route `POST /next` so it:
- preserves/derives `context.execution` from the current stored session state (mirroring Vite-plugin behavior), OR
- otherwise uses the exact same action/step values expected by `simulations/*/request.json` for that step number

### Acceptance criteria
- No simulation fixture changes required.
- Add an integration/unit test that asserts both entrypoints produce the same `context.execution` shape for the same session state.

