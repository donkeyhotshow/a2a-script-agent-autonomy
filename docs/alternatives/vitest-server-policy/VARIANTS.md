# a2a-server Vitest policy — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`a2a-server/vitest.config.ts`**: **bail: 1** (stop after first failure), **environment: node**, **include** `tests/**/*.test.ts`, **setupFiles** `tests/setup.ts`, **coverage** provider **v8**, **include** `src/**/*.ts`.

## Context

**Bail 1** speeds CI red feedback but hides secondary failures. **Coverage** adds time; you may gate it on main-only jobs.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `bail-first-fail` | As in config | First test failure stops run. | Fast signal; run full suite locally to see all failures. |
| `no-bail` | bail: 0 | See all failing tests in one CI run. | Longer logs. |
| `coverage-on-main` | Optional job | Unit tests always; **vitest run --coverage** only nightly or main. | Saves CI minutes. |

## Current selection (this repo)

- [ ] `bail-first-fail`
- [ ] `no-bail`
- [ ] `coverage-on-main`

**Notes:**

## Implementation backlog

- [ ] Document chosen policy in `a2a-server/docs/TESTING-MOCKING-GUIDE.md` one-liner.

## Related

- `a2a-server/vitest.config.ts`
- `docs/alternatives/server-test-mode/VARIANTS.md`

## Open questions

- …
