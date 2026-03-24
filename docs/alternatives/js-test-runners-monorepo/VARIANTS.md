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

## Open questions

- …
