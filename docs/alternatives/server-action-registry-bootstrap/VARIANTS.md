# Server action registry bootstrap — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- On start, **`actionRegistry.loadFromDirectory()`** reads MD definitions from **`src/actions/definitions`** relative to **server cwd** (or ctor path). **`a2a-server/src/index.ts`** logs failure but **still starts** the HTTP server if load throws.

## Context

You choose whether a **missing/broken action pack** should **block** deploy (strict) or allow **degraded** router behavior (current lenient bootstrap).

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `lenient-start` | Current | Server up even if registry load fails; count may be 0. | Good for dev; risky if prod relies on actions. |
| `fail-fast` | Hard requirement | Process exit non-zero if load fails. | Safer prod; needs health check alignment. |
| `custom-definitions-dir` | Fork layout | Pass alternate directory via registry API (requires code/init change). | Multi-product server images. |

## Current selection (this repo)

- [ ] `lenient-start`
- [ ] `fail-fast`
- [ ] `custom-definitions-dir`

**Notes:**

## Implementation backlog

- [ ] If adopting `fail-fast`, add explicit startup test in deploy playbook.

## Related

- `a2a-server/src/index.ts`, `a2a-server/src/actions/action-registry.ts`
- `a2a-server/scripts/run-simulation.ts` (also calls `loadFromDirectory`)

## Open questions

- …
