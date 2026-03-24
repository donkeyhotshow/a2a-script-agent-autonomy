# Invoke sync vs async — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Client still speaks HTTP; **async** path may return `promiseId` and require polling. **Sync** returns `execute` in the same response when the server completes work immediately.

## Context

`DEFAULT_SYNC_MODE` (and request `sync: true`) change whether `/api/v1/invoke` tends to resolve **inline** (forms, simple steps) or **promise-first** (LLM-heavy). Pick what your environment and tests assume.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `async-default` | Promise-first | Normal production-style async; poll until completed. | Default when `DEFAULT_SYNC_MODE` unset / false. |
| `sync-dev` | Sync biased | `DEFAULT_SYNC_MODE=1` for faster UI/sim loops without polling. | Documented in `AGENTS.md` for dev. |
| `per-request` | Explicit `sync` flag | Callers set `sync: true` only when needed. | Mixed automation. |

### `async-default`

- **Use when:** real LLM latency, realistic E2E.
- **Cost / risk:** polling, loader semantics, longer tests.
- **Status:** candidate

### `sync-dev`

- **Use when:** router/forms, simulations, quick feedback.
- **Cost / risk:** not representative of prod latency; some paths may still async.
- **Status:** candidate

### `per-request`

- **Use when:** tests mix sync steps and long-running dialog.
- **Cost / risk:** every client must know when to poll.
- **Status:** candidate

## Current selection (this repo)

- [ ] `async-default`
- [ ] `sync-dev`
- [ ] `per-request`

**Where it applies:** (e.g. dev `.env` vs CI)

**Notes:**

## Implementation backlog

- [ ] Single matrix doc: env + client flag → behavior.

## Related

- `AGENTS.md` (Request Flow Types, `DEFAULT_SYNC_MODE`)
- `a2a-client/packages/sdk/src/server/config/index.ts` (`defaultSyncMode`)

## Open questions

- …
