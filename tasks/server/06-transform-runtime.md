# Task 6: Server transform runtime (executor for server-transforms-*.json)

## Goal

Design and implement a small runtime that:

- Reads per-step JSON transform configs:
  - `server-transforms-request.json`
  - `server-transforms-response.json`
- Validates them against:
  - `docs/new-request-flow/json-schemas/server-transform.schema.json`
- Applies `steps` (JSONPath-based pipeline) to:
  - request side: `request.json` → `request.md`
  - response side: `response.md` → `response.json`

## References

- Transform DSL schema:
  - `docs/new-request-flow/json-schemas/server-transform.schema.json`
- Simulation format / pipeline:
  - `docs/new-request-flow/SIMULATION-FORMAT.md`
  - `simulations/SCHEMA.md`
- Protocol / schemas:
  - `docs/new-request-flow/PROTOCOL.md`
  - `docs/new-request-flow/SCHEMAS.md`
  - `docs/new-request-flow/json-schemas/server-invoke-request.schema.json`
  - `docs/new-request-flow/json-schemas/server-invoke-response-first-form.schema.json`
  - `docs/new-request-flow/json-schemas/server-invoke-response-execute.schema.json`
  - `docs/new-request-flow/json-schemas/server-invoke-response-pending.schema.json`
- Example transforms to study (current `.md` descriptions, to become JSON):
  - `simulations/coder/3/server-transforms-request.md`
  - `simulations/coder/3/server-transforms-response.md`
  - Similar files in `coder-smart/`, `auto-ai/`, `task-decomposition/`

## Design requirements

1. **Execution model**
   - The runtime should:
     - Take as input:
       - `inputJson` (parsed `request.json` **or** parsed LLM JSON from `response.md`).
       - `transformConfig` (parsed JSON from `server-transforms-*.json`).
       - Optional `fileContext` (for reading `response.md`, writing `request.md` / `response.json`, resolving `templateRef` paths).
     - Produce:
       - `outputJson` (for `response.json` or intermediate state).
       - Any side-effect files described by ops (e.g. `render-markdown` → `request.md`).
   - Supported ops (as per schema):
     - `copy`
     - `set`
     - `append-to-array`
     - `parse-json-from-md`
     - `render-markdown`
     - `switch`
2. **JSONPath / data model**
   - Choose a JSONPath library for Node (TypeScript) and define:
     - How `$` (input) and `$out` (output) are represented internally.
     - How additional roots (e.g. `$llm`) are stored (probably inside a single working object).
   - Define resolution rules:
     - `from`, `valueFrom`, `discriminator`, `data` are JSONPath expressions.
     - `path`, `to` are JSONPath expressions in `$out` / working object.
3. **File IO support**
   - For `parse-json-from-md`:
     - Read a markdown file (relative to simulation step directory).
     - Extract the JSON block (e.g. first fenced ```json block).
     - Parse it and store under the specified JSONPath (`to`), default `jsonPath` = `$`.
   - For `render-markdown`:
     - Resolve `templateRef` (e.g. `a2a-server/src/actions/definitions/coder.md#system-prompt`).
     - Render markdown by:
       - Taking the template content (entire file or section by anchor).
       - Optionally applying a simple templating step (e.g. Mustache / Handlebars) with `data` JSON as context.
     - Write result to `outputFile` (`request.md`) in the same step directory.
4. **Error handling**
   - Fail fast and clearly when:
     - JSONPath expressions are invalid or resolve to unexpected types.
     - Required fields are missing in the transform config (schema mismatch).
     - Template references cannot be resolved.
   - Provide structured errors (with step path, file name, op index) for debugging.

## Implementation plan (high-level)

1. Implement a pure runtime module (e.g. in `a2a-server` or a shared package) with:
   - `runTransformPipeline(inputJson, transformConfig, ctx): Promise<{ outputJson }>`
2. Integrate into simulation tooling:
   - When running simulations, use the runtime instead of `.md` text instructions.
3. (Optional) Integrate into server:
   - Allow `a2a-server` to use the same runtime for real requests, where appropriate.

## Acceptance criteria

- A documented design (in `docs/new-request-flow/` or package docs) for the transform runtime.
- A working implementation that:
  - Loads `server-transforms-*.json`.
  - Applies pipelines correctly for at least coder/3 request+response.
- Clear, actionable error messages when transforms or paths are wrong.

