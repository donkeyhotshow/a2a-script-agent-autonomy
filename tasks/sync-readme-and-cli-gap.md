# Sync README / CLI alignment

**Status:** done (2026-04-02)
**Tracked in:** [`work/STATE.md`](../work/STATE.md) — row S11 references `simulations/sync` coverage.

## Goal

Make `simulations/sync/README.md` and the CLI scripts (`sim:lint`, `sim:validate`, `sim:check-md`, `sim:contract-report`) describe the same workflow for exercising the sync simulations. Operators should know how to scope to `simulations/sync` without stumbling over missing `--help` documentation or mismatched example commands.

## Scope

1. Update `simulations/sync/README.md` with the latest CLI usage (`sim:lint -- --all`, `sim:validate -- --all`, `sim:validate -- --step-contract`, `sim:check-md -- --path`, `npm run sim:contract-report`) plus pointers to the stack scripts that run them.
2. Document `--path`, `--sim`, and optional `--under` / `--prefix` patterns for `sim:validate` so people can limit verification to a subset of sync simulations without needing a custom script.
3. Note the `sim:check-md` / `sim:quality` combos and where to find the golden `/response.md` / `/request.md` mirrors for debugging transforms.
4. Confirm `package.json` / `a2a-server/package.json` call the same script entry points that the README describes (e.g., `sim:check-md` and `sim:validate`).

## Acceptance

- [x] `simulations/sync/README.md` mentions the canonical commands and links to `scripts/sim-validate` / `scripts/sim-lint` helpers.
- [x] `npm run sim:validate -- --all` / `npm run sim:check-md -- --path <sim>` run as described in the README without manual tweaking.
- [x] Shared CLI entry points appear in `package.json` / `a2a-server/package.json` and are referenced from the README.
