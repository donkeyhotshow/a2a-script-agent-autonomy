# Planning Review

## Summary

After reviewing `docs/planning`, several issues no longer match current `a2a-server` code. To scale planning, each issue should map to a real module and simulations/LLM logic should be checked against the current stack (`ActionService`, `dialogRequestProcessor`, `determineRequestType`). Canonical simulations are under repo root [`simulations/`](../../simulations/) — see [`REFERENCE.md`](REFERENCE.md).

## Findings

1. **Issue 1 (router)** — The doc mentions a missing `loadFromDirectory` call, but the registry is initialized via `a2a-server/src/actions/action-service.ts` (see `initialize`). Update the issue text to explain where to find `ActionRegistry` logs and how to reload `fix-vue-imports` / `coder`.

2. **Issue 2 (dialog history)** — Current code (`a2a-server/src/services/core/request-processor/dialog-request-processor.ts`) already builds history via `getExistingDialogHistory`, appends user/assistant in `buildDialogProcessResultFromContext`, and `recoverDialogFromLlmPromise` uses the same path. The described bugs may be stale; add checks that `runPromptsTransform` receives `result` with the required fields.

3. **Issue 3 (coder audit)** — The `result.choice` problem remains; tie it explicitly to `determineRequestType` in `a2a-server/src/services/core/request-processor/request-processor.service.ts` and to `ACTION_TO_SCHEMA` in `dialog-request-processor.ts`. The write-up should state that formal types (`RequestType`) drive routing and that `result.choice` must enter the dialog path.

## Next steps

1. Add a "Code anchor" section to each issue with file/line references (e.g. `action-service.ts` for Issue 1, `dialog-request-processor.ts` for Issue 2, `request-processor.service.ts` for Issue 3).
2. Update Issues 1 and 3 so the simulation test loop includes `node a2a-server/scripts/run-simulation.ts <name>` and log checks (`ActionRegistry`); Issue 2 should verify `context.history` is written only via `buildDialogProcessResultFromContext`.
3. In [`README.md`](README.md) or [`WORKFLOW.md`](WORKFLOW.md), link [`AGENTS.md`](../../AGENTS.md) (especially action-type keys and transforms) so planning does not interpret `execute` / `result` differently.
