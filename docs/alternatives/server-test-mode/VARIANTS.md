# a2a-server Vitest TEST_MODE — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- `a2a-server/package.json` scripts set **TEST_MODE** for server tests: `mocked`, `recording`, `replay`, `real`.

## Context

Choose how much real network, LLM, or DB participates in Vitest. CI usually uses the fastest deterministic mode.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `mocked` | Default mocks | No external calls; stable shape. | Default when unset per test docs. |
| `replay` | Recorded fixtures | Replays captured responses. |
| `recording` | Capture goldens | Updates recordings; local maintainer use. |
| `real` | Live dependencies | Hits real services; higher fidelity, flaky risk. |

### `mocked`

- **Use when:** `npm test`, PR checks.
- **Cost / risk:** mocks can drift from production.
- **Status:** candidate

### `replay`

- **Use when:** contract tests with frozen payloads.
- **Cost / risk:** fixture directories to maintain.
- **Status:** candidate

### `recording`

- **Use when:** refreshing expectations locally.
- **Cost / risk:** do not gate CI without review.
- **Status:** candidate

### `real`

- **Use when:** nightly or manual smoke with stack running.
- **Cost / risk:** env setup, time, flakes.
- **Status:** candidate

## Current selection (this repo)

- [ ] `mocked` — default CI
- [ ] `replay`
- [ ] `recording` — local only
- [ ] `real` — scheduled or manual

**Where it applies:**

**Notes:**

## Implementation backlog

- [ ] Cross-link from `docs/new-request-flow/SERVER-SIMULATION-TESTS.md` if modes expand.

## Related

- `a2a-server/package.json` (`test:mocks`, `test:record`, `test:replay`, `test:real`)
- `a2a-server/docs/TESTING-MOCKING-GUIDE.md`
- `a2a-server/tests/integration/configurable.test.ts`

## Open questions

- …
