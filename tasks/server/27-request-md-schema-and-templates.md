# 27 – Canonical request.md schema and templates for AI-Actions

## Context

Simulations use `request.md` as an LLM prompt (for example `simulations/dialog/3/request.md`), but there is no formalized, reusable schema or template set on the server side. For replay (`LLM_REPLAY_DIR`) and for predictable behavior, the server must regenerate **the same logical prompt** as in simulations using **the same templates**, not hand-written strings in code.

## Goal

Define a canonical structure for `request.md` for AI-Actions and implement per-action markdown templates that the transform pipelines can use deterministically.

All prompt structure must live in markdown template files interpreted by the pipeline engine, not in TypeScript.

## Requirements

- **Canonical structure**
  - `System Prompt` section – role & behavior instructions for the LLM (per AI-Action).
  - `Response Format` section – explicit JSON schema the LLM must output (for example `{ "message": "..." }`, richer for `coder` / `auto-ai`).
  - `Current State` section – serialized JSON snapshot, similar to existing sims:
    - `context` (including `execution`, `history`).
    - `result` (for follow-up steps).
    - Additional fields when present: `docVirtual`, `ragResults`, etc.
  - `Constraints` section – rules: action-key shape, valid JSON only, language, no trailing commas, etc.

- **Templates as files**
  - Store templates under a dedicated directory in server repo, for example `a2a-server/prompts/`:
    - `dialog-request.md`
    - `coder-request.md`
    - `auto-ai-request.md`
    - `analyze-request.md`
  - Each template receives a single `data` object (for example `{ context, result, extras }`) from the pipeline.
  - Use a simple, deterministic templating engine compatible with the `render-markdown` pipeline op (no runtime logic beyond interpolation/loops).
  - The same templates should be:
    - referenced by runtime pipelines (`templateRef`),
    - usable by simulation tooling if needed (no special server-only syntax).

- **Integration with transforms**
  - Update / define `server-transforms-request` configs so they reference server-side templates instead of hard-coded paths into `simulations`:
    - `templateRef: "prompts/dialog-request.md"` (or similar logical id).
  - Ensure the JSON passed to `render-markdown` matches template expectations:
    - stable ordering of fields where necessary for deterministic diffing.

- **Determinism for replay**
  - Generated `request.md` for a replayed simulation step must be:
    - byte-identical OR
    - equal under a clearly specified normalization (for example normalize line endings and JSON pretty-print).
  - Tests must encode the normalization rules explicitly to avoid accidental drift.

- **Schema / docs**
  - Document the canonical `request.md` layout (short spec, either here or linked doc).
  - Keep examples in sync with simulations (for example `simulations/dialog/3/request.md`).

## Acceptance criteria

- Documented `request.md` schema for AI-Actions.
- Templates implemented for at least:
  - `dialog`
  - `coder`
  - `auto-ai`
- Transform pipelines for these actions reference the new templates via `templateRef`, not via simulation paths.
- Tests comparing generated `request.md` against existing simulation files for at least one step per AI-Action, using the agreed normalization rules.
- No action-specific prompt-building strings in server code; prompts are always produced via `render-markdown` + templates.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
- `simulations/SCHEMA.md`
- `simulations/dialog/3/request.md`
- `simulations/coder/*/request.md`
- `simulations/auto-ai/*/request.md`

