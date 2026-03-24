# E2E browser testing (Playwright) — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Root `package.json` includes **Playwright** as a dependency; tests assume a **runnable web stack** (URLs, ports) per project config.

## Context

You choose **when** full browser E2E runs (local pre-push, CI, release) and **against which** Client API deployment (5173 Vite vs 3001 SDK).

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `ci-gate` | Block merge on green | Playwright in required CI job. | Highest confidence, slowest PRs. |
| `nightly` | Scheduled only | PR uses unit/sim; browser nightly. | Cheaper CI; discover regressions later. |
| `manual-smoke` | On-demand locally | Engineers run before release. | No automation guarantee. |
| `vite-target` | Tests hit 5173 | Same-origin Client API as devs. | Align with ADR-0028 primary. |
| `sdk-target` | Tests hit 3001 | Stable API port for scripts. | Good for headless service assumptions. |

## Current selection (this repo)

- [ ] `ci-gate`
- [ ] `nightly`
- [ ] `manual-smoke`

**Client target:**

- [ ] `vite-target`
- [ ] `sdk-target`

**Notes:**

## Implementation backlog

- [ ] Document chosen target URL in one test README.

## Related

- Root `package.json` (`playwright`)
- `a2a-client/playwright.config.ts` (`CROSS_BROWSER`, `REUSE_SERVER`, `FRESH_SERVER`)
- ADR-0021 (cross-browser matrix)
- `docs/adr/ADR-0028-client-api-deployment-modes.md`

## Playwright execution (from `a2a-client/playwright.config.ts`)

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `browser-chromium-first` | Default projects | Desktop + mobile Chromium-focused matrix. | Fast baseline. |
| `cross-browser-full` | `CROSS_BROWSER=true` | Enables full Firefox/WebKit matrix per config comment. | ADR-0021 style coverage; slower. |
| `reuse-server-ci` | `REUSE_SERVER=true` | Reuse running stack on CI when allowed. | Faster; can hide startup bugs. |
| `fresh-server-dev` | `FRESH_SERVER=true` | Force clean server between runs locally. | Slower; isolates state. |

**Current selection (Playwright env):**

- [ ] `browser-chromium-first`
- [ ] `cross-browser-full`
- [ ] `reuse-server-ci`
- [ ] `fresh-server-dev`

## Open questions

- …
