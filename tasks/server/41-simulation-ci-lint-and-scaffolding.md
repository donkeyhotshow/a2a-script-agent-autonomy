# Task 41: Simulation CI linting and scaffolding tools

## Goal

Strengthen **developer ergonomics** around simulations and transforms by:

- Adding CI linting/validation for all simulation files and transform configs.
- Providing scaffolding tools to create new simulations + corresponding server/client config in a consistent, file-driven way.

## Background

We already have:

- `a2a-server/scripts/sim-*.ts` for running/comparing/reporting simulations.
- `simulations/SCHEMA.md` + JSON schemas for transform files.

But contributors still need to:

- manually keep transforms/templates/simulations in sync,
- remember the required shapes and naming conventions.

## Requirements

- **1. Simulation lint command**
  - Implement a CLI (or extend existing `sim-validate.ts`) that checks:
    - every simulation step directory has valid combinations of:
      - `request.json`, `server-transforms-request.json`, `request.md`, `response.md`, `server-transforms-response.json`, `response.json` (per `SCHEMA.md`),
    - JSON files validate against:
      - protocol schemas (`request.schema.json`, `response.schema.json`),
      - `server-transform.schema.json` for transforms.
    - naming conventions (kebab-case directories, step numbering, action ids).
  - Expose as `npm run sim:lint` (or similar).

- **2. CI integration**
  - Add `sim:lint` (and, optionally, golden tests from Task 31) to CI:
    - fail on invalid JSON,
    - fail on schema violations,
    - fail on missing or extra files that break `simulations/SCHEMA.md`.

- **3. Simulation scaffolding**
  - Extend `a2a-server/scripts/sim-create.ts` or add a new tool that:
    - given an `actionId` and type (`action` vs `ai-action`),
    - creates a directory under `simulations/<name>/` with:
      - `description.md` based on a template,
      - initial `1/` step with `request.json` + `response.json` skeletons,
      - optional `server-transforms-*.json` stubs and `request.md` / `response.md` templates referencing server prompts.
  - Optionally also:
    - stub corresponding transform config/prompt files in `a2a-server` and action registry entries.

- **4. Authoring helpers**
  - Document and (if useful) script:
    - converting a recorded real request/response pair into a new simulation step,
    - regenerating `server-transforms-*.json` skeletons from known input/output pairs (e.g. by diffing shapes).

## Acceptance Criteria

- `npm run sim:lint` (or equivalent) validates all simulations and fails on:
  - schema issues,
  - missing required files,
  - broken naming/structure.
- CI runs simulation linting (and optionally golden tests) by default.
- Contributors have a simple command to scaffold new simulations that already follow:
  - `simulations/SCHEMA.md`,
  - action-key shape,
  - correct file naming/layout.

## References

- `simulations/SCHEMA.md`
- `docs/new-request-flow/SIMULATION-FORMAT.md`
- `docs/new-request-flow/SIMULATION-VALIDATION.md`
- `a2a-server/scripts/sim-create.ts`
- `a2a-server/scripts/sim-validate.ts`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 41) and catalogued the simulation linting, CI integration, and scaffolding helper expectations.
- 📌 Notes recorded so the CLI validation tooling, CI job, and scaffolding scripts can be built with the documented schemas and templates when the team begins that effort.
- 📝 Next steps: implement `npm run sim:lint`, plug it into CI alongside golden tests, and extend scaffolding/scripts to match the documented workflow.
