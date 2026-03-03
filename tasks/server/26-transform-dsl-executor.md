# 26 – Transform DSL executor for simulations pipelines

## Context

Server must mirror the simulations pipeline:
`request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json → response.json`.

Current simulations define transforms as JSON pipelines (for example `simulations/dialog/3/server-transforms-request.json`), but server code does not yet have a **generic interpreter** for these definitions.

This task must ensure that **all server-side data manipulation for these steps is expressed as files (pipelines) interpreted by a single engine**, not as ad‑hoc action-specific code.

## Goal

Implement a reusable, pure transform engine for `server-transforms-request.json` / `server-transforms-response.json` pipelines that operates on JSON objects and markdown artifacts, and supports all operations used by simulations.

All per-action behavior stays in pipeline JSON files, not in TypeScript branches.

## Requirements

- **Pipeline model**
  - Support `type: "pipeline"` with ordered `steps[]`.
  - Each step has `op` and op-specific fields.
  - Engine must be **action-agnostic**: it never checks `action` names, only executes the described steps.

- **Supported ops (MVP, mirroring existing sims)**
  - `copy` – deep copy from one JSONPath (`from`) to another (`to`).
  - `set` – assign value at `path`; support:
    - direct JSON literals,
    - string templates referencing other paths (simple interpolation).
  - `append-to-array` – push `value` into array at `to`; auto-create empty array if missing.
  - `render-markdown` – render a markdown template into a string:
    - `templateRef`: logical ref to md template file (server-side path, **not** pointing back into `simulations`).
    - `data`: JSONPath expression; resolved object is passed into template.
    - `outputFile`: logical filename (for example `"request.md"`) for downstream usage.
  - `parse-json-from-md` – extract JSON from markdown:
    - `fromFile`: logical markdown source name (for example `"response.md"`).
    - `jsonPath`: JSONPath inside parsed JSON (usually `$`).
    - `to`: destination JSONPath (for example `$llm`).

- **Data model & paths**
  - Support working roots: `$` (input), `$out` (mutable output), and additional working roots used by sims (for example `$llm`).
  - JSONPath subset: root, nested objects/arrays, simple property access (`$.context.history`, `$.result.message`).
  - All intermediate state is stored in the JSON tree; no hidden globals.

- **API shape**
  - Export a pure function, for example:
    - `runPipeline({ input, pipeline, files }): { output, artifacts, logs }`.
  - `files` is an abstraction for reading/writing **logical artifacts** (for example named `request.md`, `response.md`), so the executor stays decoupled from HTTP/FS and can be used in tests and runtime.
  - The same executor must be usable both:
    - by unit tests (feeding simulations fixtures),
    - by the HTTP layer for live requests.

- **Error handling & diagnostics**
  - Clear errors when JSONPath misses required data (configurable: strict vs lenient mode).
  - Collect per-step debug logs (op name, paths, small snapshots) to aid debugging.
  - Fail fast on unknown `op` values.

- **Schema & unification**
  - Define (or align with existing) JSON Schema for pipeline definitions so that:
    - all `server-transforms-*.json` in `simulations` and runtime config validate against the same schema;
    - new ops must extend the schema, not be hardcoded silently.

## Acceptance criteria

- Unit tests for each op with realistic examples from:
  - `simulations/dialog/*/server-transforms-request.json`
  - `simulations/dialog/*/server-transforms-response.json`
  - At least one non-dialog simulation (for example `analyze` or `auto-ai`).
- Ability to feed a `request.json` + `server-transforms-request.json` and obtain the exact `request.md` from the corresponding simulation (byte-identical or via defined normalization).
- Ability to feed a `response.md` + `server-transforms-response.json` and obtain the exact `response.json` from the simulation for at least one dialog step.
- No action-specific branches in the executor; all differences between actions are in the pipeline JSON files.
- Executor module lives in `a2a-server` and is imported by higher-level engine code, but has **no dependency on HTTP, LLM, or DB**.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/ARCHITECTURE.md`
- `simulations/SCHEMA.md`
- `simulations/dialog/3/server-transforms-request.json`
- `simulations/dialog/3/server-transforms-response.json`

