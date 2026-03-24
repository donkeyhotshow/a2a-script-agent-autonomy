# Playwright CI vs local tuning — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`a2a-client/playwright.config.ts`** branches on **`process.env.CI`**: **fullyParallel**, **maxFailures**, **forbidOnly**, **retries**, **workers**, **junit** reporter, **video**, **slowMo**.

## Context

Local runs favor speed; CI favors **stability** (retries, slowMo, video on failure). Choose a **profile** that matches runner capacity.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `upstream-defaults` | As in config today | CI retries 3, workers capped, video retain-on-failure. | Good baseline; tune if queue times hurt. |
| `fast-ci` | Reduce retries / no slowMo | Risk flakiness; faster PRs. | Needs stable app under load. |
| `strict-local` | Match CI locally | Same retries/workers as CI on laptop. | Reproduces CI flakes; painful. |

## Current selection (this repo)

- [ ] `upstream-defaults`
- [ ] `fast-ci`
- [ ] `strict-local`

**Notes:**

## Implementation backlog

- [ ] If using self-hosted runners, document CPU recommendation next to **workers** line.

## Related

- `a2a-client/playwright.config.ts`
- `docs/alternatives/e2e-browser-testing/VARIANTS.md`

## Open questions

- …
