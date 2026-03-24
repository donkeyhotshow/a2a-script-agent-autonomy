# ADR-0001: Simulations as Golden Standard

Status: accepted
Date: 2026-03-02

## Context

The system has multiple layers and transform stages that can drift over time:

- Web UI (drives the Client API)
- Client API (stores sessions, proxies to server, executes client actions)
- Server (stateless request processor, protocol transforms)
- AI Hub / LLM proxy (optional, async promise flow)

For the new request flow the canonical protocol and pipeline are:

- Protocol rules in `docs/new-request-flow/PROTOCOL.md` (action-key shape, `execute.*` types, stateless server, context vs result).
- Step pipeline and file layout in `simulations/SCHEMA.md`:
  `request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json → response.json`.

Without a single golden source across all of these stages it is hard to:

- refactor protocol shapes safely
- swap implementations per layer or executor
- prove that behavior stayed the same after changes
- detect regressions inside individual transforms (not only at the outer request/response level)

## Decision

1. **Simulation data is the golden standard for the entire pipeline.**
   - Each simulation step directory under `simulations/` is a canonical contract for:
     - client → server request (`request.json`)
     - server internal transforms to LLM (`server-transforms-request.json`, `request.md`)
     - LLM response (`response.md`) when applicable
     - server internal transforms back to client (`server-transforms-response.json`)
     - server → client response (`response.json`)
   - Any change in protocol, transforms, or behavior must either preserve compatibility with existing simulation data
     or update all affected step artifacts in a single change set.

2. **All stages must be runnable in "replay" mode and testable in isolation.**
   - Given a simulation step, we must be able to:
     - feed `request.json` into the server and reproduce the expected `response.json`;
     - for steps with LLM, reproduce `request.md` from `request.json` and `server-transforms-request.json`,
       and consume the recorded `response.md` instead of calling a real model;
     - for purely server-side transforms, replay `server-transforms-request.json` → `server-transforms-response.json`
       without external dependencies.
   - External dependencies (LLM, network, filesystem) are stubbed, recorded, or proxied so that replay is stable.

3. **Comparisons are contract-based and aligned with the new protocol.**
   - We compare only canonical, semantically meaningful fields:
     - action-key shape for `execute` and `result`;
     - separation of `context` and top-level `result` (final step only);
     - server statelessness (no hidden session fields);
     - allowed `execute` types (`form`, `message`, `script`, `read-file`, `write-file`, `rag-search`, `execute-command`).
   - Known nondeterministic fields (timestamps, ids, non-semantic ordering) are normalized or ignored.
   - The canonical shape is defined by `docs/new-request-flow/PROTOCOL.md`; file layout and semantics per step
     are defined by `simulations/SCHEMA.md`.

4. **Changes that break the golden standard require explicit migrations.**
   - If a protocol or simulation schema upgrade is required:
     - add a transformer/migration that can upgrade existing fixtures;
     - update affected simulation directories (all step artifacts) in the same commit;
     - document the breaking change and the migration path.
   - Legacy formats (`actions[]`, `fallbackActions[]`, `proposedActions`, `subActions`, `dslScript`, etc.)
     are supported only via explicit transformers; the canonical format for new work is `execute.form.choices`
     and action-key shape.

5. **Feature and bugfix workflow is simulation-first, across all stages.**
   - For any new cross-layer feature or bugfix:
     - start by adding or updating simulations (including all relevant step files, not only `request.json` / `response.json`);
     - implement or adjust server, client API, and UI until replayed outputs match the updated simulations;
     - keep simulations readable enough to serve as executable documentation of the flow.

### Testing per stage

For each simulation and each step we test:

- **Server API level:** `request.json → response.json` using the real server process with all external calls stubbed by simulation data.
- **Transform level (server-internal):**
  - `request.json → server-transforms-request.json`
  - `server-transforms-request.json → request.md`
  - `response.md → server-transforms-response.json`
  - `server-transforms-response.json → response.json`
- **LLM level:** `request.md ↔ response.md` — recorded prompts and completions are treated as fixtures; no live model is called in replay.
- **End-to-end flow:** "first request" and "step" flows as described in `PROTOCOL.md`, including action selection (`execute.form.choices`) and subsequent `execute.script` / client results.

## Consequences

### Positive

- Safer refactors: regressions appear as diffs against golden fixtures at the appropriate stage (server-only, LLM I/O, or end-to-end).
- Faster development: each layer and transform can be tested in isolation without running the full stack or a real LLM.
- Protocol stability: action-key shape, `execute.*` rules, and context/result conventions are enforced by simulation tooling.
- Better observability: simulations double as executable docs of the new request flow, including async AI Hub / promise flows.

### Trade-offs

- Fixture maintenance cost: when behavior changes intentionally, all affected step artifacts must be updated.
- Some flows are inherently nondeterministic (LLM); these require stubs, recorded responses, or promise-based flows that are replayable.
- Strict contracts can make experimental changes slower initially, but reduce long-term protocol drift.

## Implementation Notes

- Simulation tooling lives in `a2a-server/scripts/` (e.g. `sim-run`, `sim-validate`, `sim-compare`); it should support
  both full-flow replays and per-step checks where applicable.
- The canonical protocol and new request flow are described in `docs/new-request-flow/PROTOCOL.md`.
- The simulation pipeline and per-step file semantics are described in `simulations/SCHEMA.md` (for async AI Hub flows).
- Server-side preparation of the object used to render `request.md` (fold `result` into `context.history`, `flowControlHint`) is specified in [ADR-0026](ADR-0026-server-llm-request-prep.md) and `a2a-server/docs/LLM-REQUEST-PREP.md`; golden `request.md` must be regenerated when that prep changes.
- Doc ownership / link-first rules: [ADR-0027](ADR-0027-documentation-canonical-sources.md).
- When adding a new feature that spans layers, first add or extend a simulation (all necessary step files), then
  implement or adjust the layers until all stage comparisons pass.

## Follow-ups

- Define and implement a shared normalization library for comparisons (strip ids/timestamps, sort arrays where needed).
- Add CI jobs that:
  - validate all simulation files against `simulations/SCHEMA.md`;
  - run all simulations in replay mode (full flow and, where useful, per-stage) and fail on diffs against golden fixtures.

