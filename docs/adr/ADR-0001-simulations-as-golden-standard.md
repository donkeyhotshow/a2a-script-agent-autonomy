# ADR-0001: Simulations as Golden Standard

Status: accepted
Date: 2026-03-02

## Context

The system has multiple layers that can drift over time:

- Web UI (drives the client API)
- Client API (stores sessions, proxies to server, executes client actions)
- Server (stateless request processor, protocol transforms)
- AI Hub / LLM proxy (optional, async promise flow)

We already have a simulation pipeline and recorded artifacts under `simulations/` and docs under
`docs/new-request-flow/`. Without a single "truth source", it becomes hard to:

- refactor protocol shapes safely
- swap implementations per layer
- prove that behavior stayed the same after changes

## Decision

1. Simulation data is the golden standard.
   - Recorded `request.json` / `response.json` (and optional `request.md` / `response.md`) define expected behavior.
   - Any layer change must preserve simulation compatibility or explicitly update the simulation fixtures.

2. Each layer must be runnable in "replay" mode.
   - Given simulation inputs, the layer can produce outputs deterministically enough to compare.
   - External dependencies (LLM, network, filesystem) must be stubbed or captured where needed.

3. Comparisons are contract-based, not snapshot-of-everything.
   - Compare canonical fields (protocol objects and their shape) and ignore known nondeterministic fields:
     timestamps, ids, ordering where it is not semantically important.
   - The canonical format is defined by `docs/new-request-flow/PROTOCOL.md` and the simulation schema by
     `simulations/SCHEMA.md`.

4. Changes that break the golden standard require an explicit migration.
   - If a protocol upgrade is required, add a transformer/migration and update fixtures in a single change set.
   - Document the breaking change and why it is necessary.

## Consequences

### Positive

- Safer refactors: behavior regressions show up as diffs against fixtures.
- Faster development: layers can be tested without running the full stack.
- Protocol stability: the action-key shape and `execute.*` rules can be enforced with tooling.

### Trade-offs

- Fixture maintenance cost: when behavior changes intentionally, fixtures must be updated.
- Some flows are inherently nondeterministic (LLM); these require stubs, promises, or captured responses.

## Implementation Notes

- Simulation tooling lives in `a2a-server/scripts/` (e.g. `sim-run`, `sim-validate`, `sim-compare`).
- The simulation pipeline is described in `docs/new-request-flow/SESSION-FLOW.md` and `docs/new-request-flow/SIMULATION-FORMAT.md`.
- When adding a new feature that spans layers, add or extend a simulation first, then implement the layers until outputs match.

## Follow-ups

- Define a canonical "normalization" step for comparisons (strip ids/timestamps, sort arrays where needed).
- Add CI job that runs `sim:run-all` and fails on diffs against the golden fixtures.

