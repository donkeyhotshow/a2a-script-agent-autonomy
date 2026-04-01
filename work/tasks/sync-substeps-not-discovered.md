# Sync simulations: `N-sub-M` folders and tooling split

## Problem

**`sim-validate`** (`a2a-server/scripts/sim-validate/scanner.ts`) **skips** directory names matching `^\d+-sub-\d+$` when building the simulation list. So paths like `sync/agent-auto-ai/3-sub-1` are **not** run through `validateSimulation` (AJV / fixture checks) as their own target.

**`sim-lint`** (`lintSimulation` in `a2a-server/scripts/sim-lint/runners.ts`) **does** walk `*-sub-*` folders under each parent sim and lints JSON there when you lint the parent (e.g. `sync/agent-auto-ai`). The **CLI discovery** list in `sim-lint/registry.ts` also does not register substeps as separate top-level names, but unlike validate, the parent pass still covers them.

Examples: `agent-auto-ai/3-sub-1`, `agent-auto-ai/6-sub-1`, `interrupt-thinking/1-sub-1`, etc.

## Risk

Substep **`server-transforms-*.json`** can pass **lint** (JSON + some rules) but **never** hit **sim-validate** schema / normalization checks unless the scanner is extended or a dedicated test validates those paths.

## Done when

- [ ] Document in `simulations/sync/README.md` or `SCHEMA.md` whether substeps are informational-only or must stay schema-valid.
- [ ] If they must be checked: extend scanner with an opt-in flag (e.g. `--include-substeps`) or a dedicated small test that validates those paths.
