# Client automation: `a2a-tester` CLI — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`a2a-client/tester`** exposes **`a2a-tester`** bin (`cli.js`), suites: **panels**, **sessions**, **commands**, **performance**, **all**. Uses **ws** + **commander**.

## Context

Pick **CLI-driven** API checks vs **Playwright** browser tests vs **curl** scripts. Each covers different failure modes.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `tester-smoke` | `npm run test` in tester | Fast health / API shape checks. | Good pre-flight before UI E2E. |
| `tester-suites` | Targeted suites | `test:panels`, `test:sessions`, etc. | Narrow regression when touching one area. |
| `playwright-primary` | Browser-first | Defer CLI to optional smoke. | Richer UX coverage; slower. |
| `hybrid-gate` | Both in CI | Tester quick + Playwright subset. | Higher cost; strongest signal. |

## Current selection (this repo)

- [ ] `tester-smoke`
- [ ] `tester-suites`
- [ ] `playwright-primary`
- [ ] `hybrid-gate`

**Notes:**

## Implementation backlog

- [ ] Document base URL / auth expectations for tester in one README line.

## Related

- `a2a-client/tester/package.json`, root `package.json` (`tester`, `tester:test`)
- `docs/alternatives/e2e-browser-testing/VARIANTS.md`

## Open questions

- …
