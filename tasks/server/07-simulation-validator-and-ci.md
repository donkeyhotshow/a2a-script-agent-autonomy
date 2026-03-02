# Task 7: Simulation & schema validator (CLI + CI)

## Goal

Create a CLI/Node script (and CI hook) that validates:

- All `simulations/**/request.json` and `simulations/**/response.json` against protocol schemas.
- All `simulations/**/server-transforms-request.json` and `simulations/**/server-transforms-response.json` against the transform DSL schema.
- Produces a clear summary report suitable for local use and CI.

## References

- Protocol schemas:
  - `docs/new-request-flow/json-schemas/server-invoke-request.schema.json`
  - `docs/new-request-flow/json-schemas/server-invoke-response-first-form.schema.json`
  - `docs/new-request-flow/json-schemas/server-invoke-response-execute.schema.json`
  - `docs/new-request-flow/json-schemas/server-invoke-response-pending.schema.json`
- Transform DSL:
  - `docs/new-request-flow/json-schemas/server-transform.schema.json`
- Simulation schema / format:
  - `simulations/SCHEMA.md`
  - `docs/new-request-flow/SIMULATION-FORMAT.md`
- Docs:
  - `docs/new-request-flow/SCHEMAS.md`
  - `docs/new-request-flow/PROTOCOL.md`

## Work to perform

1. **Define validation rules**
   - Requests:
     - For each `simulations/<sim>/<step>/request.json`:
       - Validate against `server-invoke-request.schema.json`.
   - Responses:
     - For each `simulations/<sim>/<step>/response.json`:
       - Decide which response schema to apply:
         - Step 1 (first server response) → `server-invoke-response-first-form.schema.json`.
         - Steps with `execute` (script / read-file / write-file / rag-search / execute-command / form / message) → `server-invoke-response-execute.schema.json`.
         - Asynchronous steps (if modeled) → `server-invoke-response-pending.schema.json`.
       - Optionally infer type heuristically (presence of `execute` vs `promiseId`).
   - Transforms:
     - For each `server-transforms-request.json` / `server-transforms-response.json`:
       - Validate against `server-transform.schema.json`.
2. **Implement CLI**
   - Language: TypeScript/Node.
   - Location: e.g. `tools/validate-simulations/` or under a dedicated package.
   - Responsibilities:
     - Discover simulation steps (glob `simulations/**/request.json` / `response.json` / `server-transforms-*.json`).
     - Run JSON Schema validation using a library (e.g. AJV).
     - Print:
       - Per-file validation errors.
       - Summary counts: total files, passed, failed.
   - Provide CLI options:
     - `--sim <name>` to restrict to a single simulation.
     - `--json` to output machine-readable results (for CI tooling).
3. **CI integration**
   - Add a script to `package.json` (root or specific package), e.g.:
     - `"validate:simulations": "node tools/validate-simulations/index.js"`
   - Wire it into:
     - Local dev workflow (document in `README` / `AGENTS.md`).
     - CI pipeline (GitHub Actions, etc.) so that PRs touching `simulations/` or `docs/new-request-flow/json-schemas` must pass validation.
4. **Documentation**
   - Extend `docs/new-request-flow/SCHEMAS.md` or create a small doc (e.g. `docs/new-request-flow/SIMULATION-VALIDATION.md`) that explains:
     - What is validated.
     - How to run the validator locally.
     - How to interpret errors and fix simulations.

## Acceptance criteria

- A working CLI that:
  - Validates all simulation `request.json` / `response.json` against the appropriate schemas.
  - Validates all transform JSON files against `server-transform.schema.json`.
  - Exits with non-zero status if any validation fails.
- CI integration so that invalid simulations or transforms are caught before merge.
- Short documentation snippet describing usage and troubleshooting.

