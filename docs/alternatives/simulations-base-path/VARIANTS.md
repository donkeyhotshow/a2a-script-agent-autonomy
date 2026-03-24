# Simulations directory (`SIMULATIONS_PATH`) — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`SIMULATIONS_PATH`** defaults to **`./simulations`** when unset (`simulation-request-processor.ts`). Golden sims normally live in repo root `simulations/`.

## Context

Forks, CI workspaces, or multi-product monorepos may point the server at a **different** golden tree without moving files.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `repo-root` | Default `./simulations` | Matches `npm run sim:lint` from `a2a-server`. | Standard contributor path. |
| `env-override` | `SIMULATIONS_PATH` absolute | Alternate checkout or read-only mount. | Must stay in sync with `sim:validate` cwd. |
| `submodule` | Path into git submodule | Shared goldens across repos. | Submodule bump discipline. |

## Current selection (this repo)

- [x] `repo-root`
- [ ] `env-override`
- [ ] `submodule`

**Notes:**
- `SIMULATIONS_PATH` is unset, so the server loads goldens from the repo's `simulations/` directory by default.

## Implementation backlog

- [ ] If using override, document in CI so lint/validate use the same path.

## Related

- `a2a-server/src/services/core/request-processor/simulation-request-processor.ts`
- `a2a-server/scripts/sim-lint.ts`, `sim-validate.ts`

## Open questions

- …
