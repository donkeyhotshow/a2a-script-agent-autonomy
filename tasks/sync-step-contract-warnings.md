# Sync step-contract warnings

**Status:** done (2026-04-02)
**Tracked in:** [`work/STATE.md`](../work/STATE.md) — row S8, plus `simulations/SCHEMA.md` steps.

## Goal

Keep `npm run sim:validate -- --all --step-contract` green for every `simulations/sync/*` step so regression risk remains low when the transform pipeline grows. `sim:contract-report` should stay clean enough to trust when re-scanning the `Schema` JSON tree.

## Scope

1. Review each sync simulation’s `server-transforms-request.json` / `server-transforms-response.json` for extra transforms that trigger step-contract warnings and convert them to chunked `passthrough` operations where possible.
2. Ensure `simulations/SCHEMA.md` and `a2a-server/prompts/*-request.md` match the same transform footprints and call out any intentionally missing fields.
3. Re-run `npm run sim:validate -- --all --step-contract` / `npm run sim:contract-report` from the repo root to confirm no warnings remain.
4. Document the still-open scaffolding (if any) for future sync simulations in the schema file.

## Acceptance

- [x] `npm run sim:validate -- --all --step-contract` finishes with zero warnings.
- [x] `npm run sim:contract-report` lists no unexpected warning entries for sync steps.
- [x] Transform trees in `simulations/sync` either rely on passthrough JSON or have a comment that explains why warnings remain.
