# 31 – Simulation alignment and golden tests

## Context

Simulations are the golden standard (see `simulations/SCHEMA.md`). The new engine (pipelines + templates + LLM adapter + endpoints) must be regression-tested against these fixtures, especially for AI-Actions (`dialog`, `coder`, `auto-ai`, `analyze`).

The goal is to prove that **runtime server behavior = interpretation of the same file-level definitions that drive simulations**.

## Goal

Add an automated test suite that runs recorded simulations through the new engine and asserts parity for:
- `request.md` generation, and
- `response.json` building.

## Requirements

- **Test harness**
  - Utility to:
    - Load a simulation step directory.
    - Read available files:
      - `request.json`
      - `server-transforms-request.json`
      - `request.md`
      - `response.md`
      - `server-transforms-response.json`
      - `response.json`
    - Run the engine in replay mode (using `LLM_REPLAY_DIR` or an equivalent injection hook).
  - Be able to:
    - Feed `request.json` to the engine and capture generated `request.md`.
    - Feed `response.md` to the engine and capture generated `response.json`.

- **Checks per LLM-based step**
  - Given `request.json`:
    - Ensure engine’s request-transform output matches expected `request.md` from the simulation:
      - Byte-level equality or equality under defined normalization.
  - Given `response.md`:
    - Ensure engine’s response-transform output matches expected `response.json` from the simulation.

- **Coverage**
  - Include at least:
    - `simulations/dialog` (basic dialog).
    - `simulations/coder` (code-centric).
    - `simulations/auto-ai` (rich execute surface).
    - `simulations/analyze` (RAG usage, if present).
  - It should be easy to add new simulations to the suite by configuration, not by changing test code.

- **E2E invocation tests**
  - For at least one AI-Action (for example `dialog`):
    - Drive the system via HTTP endpoints:
      - `/api/v1/invoke` (returns `promiseId`),
      - `/api/v1/requests/:id/status`,
      - `/api/v1/requests/:id/result`.
    - With replay enabled for the corresponding sim step, final `response.json` must match the simulation fixture.

- **Integration into CI**
  - Add a focused test command (for example `npm test -- simulations-engine`) and wire it into existing CI config.
  - Document how to run only simulation-based tests locally.

## Acceptance criteria

- Failing tests whenever:
  - pipelines,
  - templates,
  - or engine behavior
  diverge from simulations for covered cases.
- Simple developer workflow documented:
  - How to add a new simulation and hook it into engine tests.
  - How to run only simulation-based tests.
- Tests demonstrate that **all key paths are driven by the same file-level schema as `simulations/SCHEMA.md`**, not by duplicated logic.

## References

- `simulations/SCHEMA.md`
- `simulations/dialog/*`
- `simulations/coder/*`
- `simulations/auto-ai/*`
- `simulations/analyze/*`

