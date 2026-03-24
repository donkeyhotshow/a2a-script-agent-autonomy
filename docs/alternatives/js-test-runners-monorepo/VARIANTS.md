# JS test runners across packages — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **Root + `a2a-server`:** **Vitest** (`package.json`, `a2a-server/package.json`).
- **`@a2a/rag`:** **Jest** (`a2a-client/packages/rag/package.json` `"test": "jest --bail"`).

## Context

Mixed runners mean **different config files**, **different mocks**, and **different CI jobs**. You either accept the split or converge over time.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `status-quo-split` | Vitest + Jest | Minimal change; run tests per package. | Contributors must know which command where. |
| `migrate-rag-to-vitest` | Unified Vitest | Port RAG tests; single mental model. | One-time migration cost. |
| `jest-everywhere` | Unlikely | Would migrate server to Jest — large. | Usually not worth it here. |

### `status-quo-split`

- **Use when:** time-constrained; RAG tests stable under Jest.
- **Cost / risk:** duplicated polyfills / transform config.
- **Status:** candidate

### `migrate-rag-to-vitest`

- **Use when:** you want one runner in `npm` workspaces CI.
- **Cost / risk:** rewrite mocks, snapshot paths.
- **Status:** candidate

## Current selection (this repo)

- [ ] `status-quo-split`
- [ ] `migrate-rag-to-vitest`
- [ ] `jest-everywhere`

**Notes:**

## Implementation backlog

- [ ] If converging, track in `docs/plans/` with package-by-package checklist.

## Related

- Root `package.json`, `a2a-server/package.json`, `a2a-client/packages/rag/package.json`

---

## a2a-server Vitest policy

**Last reviewed:** 2026-03-24

### Constraints (invariants)

- **`a2a-server/vitest.config.ts`**: **bail: 1** (stop after first failure), **environment: node**, **include** `tests/**/*.test.ts`, **setupFiles** `tests/setup.ts`, **coverage** provider **v8**, **include** `src/**/*.ts`.

### Context

**Bail 1** speeds CI red feedback but hides secondary failures. **Coverage** adds time; you may gate it on main-only jobs.

### Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `bail-first-fail` | As in config | First test failure stops run. | Fast signal; run full suite locally to see all failures. |
| `no-bail` | bail: 0 | See all failing tests in one CI run. | Longer logs. |
| `coverage-on-main` | Optional job | Unit tests always; **vitest run --coverage** only nightly or main. | Saves CI minutes. |

### Current selection (Vitest policy)

- [ ] `bail-first-fail`
- [ ] `no-bail`
- [ ] `coverage-on-main`

### Implementation backlog (Vitest policy)

- [ ] Document chosen policy in `a2a-server/docs/TESTING-MOCKING-GUIDE.md` one-liner.

### Related (Vitest policy)

- `a2a-server/vitest.config.ts`
- `docs/alternatives/server-test-mode/VARIANTS.md`

## Open questions

- …
