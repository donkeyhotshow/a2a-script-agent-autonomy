# Task 1: Upgrade and clean up documentation

## Goal

Bring all protocol/simulation documentation into sync with the new canonical simulations and schemas, removing obsolete docs and adding missing ones.

## Scope

- `simulations/` — reference simulations (Actions + AI-Actions).
- `docs/new-request-flow/` — architecture, protocol, schemas, simulation format.
- Any older `docs/` / `NEW-*` / duplicated files that conflict with the new flow.

## References (must read before editing)

- Global agent guide: `AGENTS.md`
- Canonical simulation schema: `simulations/SCHEMA.md`
- Actions vs AI-Actions reference: `simulations/REFERENCE.md`
- Simulation format doc: `docs/new-request-flow/SIMULATION-FORMAT.md`
- Data schemas doc: `docs/new-request-flow/SCHEMAS.md`
- Protocol doc: `docs/new-request-flow/PROTOCOL.md`
- Session flow: `docs/new-request-flow/SESSION-FLOW.md`
- Action map: `docs/new-request-flow/ACTION-MAP.md`
- Current issues / roadmap / implementation status:
  - `docs/new-request-flow/CURRENT-ISSUES.md`
  - `docs/new-request-flow/ROADMAP.md`
  - `docs/new-request-flow/IMPLEMENTATION-STATUS.md`

## Work to perform

1. **Inventory & alignment**
   - Scan `docs/`, `docs/new-request-flow/`, root `AGENTS.md`, and any `NEW-*` docs.
   - For each document, decide: keep, merge into canonical docs, or delete as obsolete.
   - Ensure `docs/new-request-flow/` is the single source of truth for:
     - Protocol between Web → Client API → Server.
     - Server invoke API (`/api/v1/invoke`) requests/responses.
     - Simulation pipeline and file formats.
2. **Migration of transform docs**
   - Replace all `server-transforms-request.md` / `server-transforms-response.md` in `simulations/**` with:
     - `server-transforms-request.json`
     - `server-transforms-response.json`
   - Use JSONPath-based pipeline format defined in:
     - `docs/new-request-flow/json-schemas/server-transform.schema.json`
   - For each step, preserve existing behavior (read the old `.md` description and encode the same logic as `type: "pipeline"`, `steps: [...]` using `copy`, `set`, `append-to-array`, `parse-json-from-md`, `render-markdown`, `switch`).
3. **Canonicalization**
   - Ensure all references in docs use the new:
     - `execute.form.choices` first-response format (instead of legacy `actions[]`).
     - Action-key shape for `execute` and `result`.
     - Asynchronous `promiseId` flow for LLM (where applicable), consistent with:
       - `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
       - `docs/new-request-flow/json-schemas/server-invoke-response-pending.schema.json`
4. **Cleanup**
   - Remove or clearly mark as legacy any documents that:
     - Describe old `actions[]`-only first responses without `execute.form.choices`.
     - Use outdated names (`proposedActions`, `subActions`, `dslScript`, etc.).
   - Update cross-links so that new readers land on `docs/new-request-flow/` docs and `simulations/SCHEMA.md`.

## Acceptance criteria

- No conflicting or duplicated protocol descriptions; `docs/new-request-flow/` + `simulations/SCHEMA.md` are the clear canon.
- All transform steps that used `.md` instructions now have JSON equivalents validating against `server-transform.schema.json`.
- All docs use consistent terminology: `actions`, `steps`, `execute`, `result`, `execute.form.choices`, action-key shape.

