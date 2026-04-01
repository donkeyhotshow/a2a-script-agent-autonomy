# Sync simulations: README and tooling gaps

**Status:** README fixed (2026-04-01). Optional CLI `--under` still open if desired.

## Problem

`simulations/sync/README.md` diverges from real behavior:

1. **Invalid CLI example** — `npm run sim:validate -- --path simulations/sync` is **not implemented**. `sim-validate` / `sim-lint` only support `--sim <name>` or `--all` (see `a2a-server/scripts/sim-validate/scanner.ts`, `sim-lint.ts`).
2. **Wrong pipeline order** — README says `client.json → received.json → response.json`. Canonical order in `simulations/SCHEMA.md` is `client.json → … → response.json → received.json` (received is sanitized **after** server response).
3. **Wrong `received.json` description** — Table calls it like a server-side artifact; it is **Client API → Web** (Web DTO after `buildExecuteProjection`).

## Done when

- [ ] README updated to match `SCHEMA.md` and actual CLI flags.
- [ ] Optional follow-up: add `--under <path>` or `--prefix sync/` to `sim-validate` / `sim-lint` so operators can scope to `simulations/sync` without `--all` (separate small PR).
