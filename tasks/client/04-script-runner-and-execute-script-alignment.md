# Client Task 04: Script Runner & execute.script Alignment

## Goal

Align `@a2a/script-runner` and the client’s handling of `execute.script` with simulations and the new engine, so that:

- All script executions (e.g. from `fix-vue-imports`, `phpunit-deprecations`, batched variants) follow a consistent interface.
- Results can be directly used as `result["script"]` in protocol shape.

## Scope

Packages:
- `a2a-client/packages/script-runner`
- integration with `@a2a/api-client` action handler

## Requirements

- **Unified script execution API**
  - Ensure script runner exposes a single function that matches API client expectations:
    - `execute(code: string, input: Record<string, unknown>, context: { workingDir?: string; sessionId?: string; stepId?: string }): Promise<{ success: boolean; data?: unknown; error?: string }>`
  - Integrate via `createExecuteCode` helper in `@a2a/api-client` so `execute.script` from server is always run through this path.

- **Simulation-compatible outputs**
  - Make sure script results can be serialized into:
    - `result["script"]` objects that match simulation examples (e.g. `broken_imports`, `patches`, counts).
  - Add adapters if needed to:
    - map raw script output to these shapes,
    - enforce that clients always respond with action-key shape.

- **Safety and sandboxing**
  - Verify sandboxing (e.g. vm2 or similar) matches client policy/limits (see Task 39).
  - Add configuration for:
    - allowed modules,
    - max execution time,
    - max memory, if supported.

- **Tests**
  - Use fragments from `fix-vue-imports` and `phpunit-deprecations` sims to:
    - run representative DSL scripts via script-runner,
    - assert outputs map correctly into `result["script"]` used in those simulations.

## References

- `simulations/fix-vue-imports/*`
- `simulations/phpunit-deprecations/*`
- `a2a-client/packages/script-runner/src/index.ts`
- `a2a-client/packages/api-client/src/action-handler.ts`

