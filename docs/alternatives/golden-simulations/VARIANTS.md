# Golden simulations workflow — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`sim:lint`** and schema rules in `AGENTS.md` (legacy golden rules: single `execute` key, action-key `result`, `workbench.sections`, etc.).

## Context

`a2a-server` ships scripts: **`sim:lint`**, **`sim:validate`**, **`sim:run`**, **`sim:run-all`**. You decide what **gates CI** vs what runs **on demand** with a live server.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `lint-only` | Static golden checks | `sim:lint --all`; fast, no server. | Best for PR hygiene. |
| `validate-offline` | Validate fixtures | `sim:validate` per sim or all; may not need LLM. | See script flags / docs. |
| `run-against-server` | `sim:run` / `sim:run-all` | Executes flows against running server. | Slower; catches integration drift. |
| `tiered-ci` | Lint always, run nightly | PR = lint+validate; schedule = full run. | Balances cost. |

### `lint-only`

- **Use when:** contributors lack full stack locally.
- **Cost / risk:** no runtime behavior proof.
- **Status:** candidate

### `validate-offline`

- **Use when:** structural correctness of golden JSON/md.
- **Cost / risk:** still not full invoke path.
- **Status:** candidate

### `run-against-server`

- **Use when:** release candidate, integration health.
- **Cost / risk:** env, time, flakes.
- **Status:** candidate

### `tiered-ci`

- **Use when:** medium/large team.
- **Cost / risk:** two pipelines to maintain.
- **Status:** candidate

## Current selection (this repo)

- [ ] `lint-only`
- [ ] `validate-offline`
- [ ] `run-against-server`
- [x] `tiered-ci`

**Where it applies:** PR lint+validate, nightly/full `sim:run-all`

**Notes:**
- All three scripts (`sim:lint`, `sim:validate`, `sim:run`) are available under `a2a-server/package.json`, so we gate PRs with lint+validate and reserve `sim:run[--all]` for scheduled integration verification.

## Implementation backlog

- [ ] Encode chosen tier in root or `a2a-server` CI config comments.

## Related

- `AGENTS.md` (Running Tests, Legacy golden simulations)
- `a2a-server/scripts/sim-lint.ts`, `sim-validate.ts`, `sim-run.ts`
- ADR-0001, ADR-0020

## Open questions

- …
