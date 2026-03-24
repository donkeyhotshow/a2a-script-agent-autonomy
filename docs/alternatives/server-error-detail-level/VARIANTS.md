# API error payload detail (stack traces) — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`a2a-server/src/middleware/error.middleware.ts`**: **`includeStack`** when **`NODE_ENV !== 'production'`**.

## Context

**Development** clients see stacks for debugging; **production** should avoid leaking internals. Confirm **NODE_ENV** is set correctly in every deploy target (including accidental `development` in prod).

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `standard-node-env` | prod hides stack | Rely on Express middleware as written. | Requires `NODE_ENV=production` in prod. |
| `always-minimal` | Future hardening | Strip stack even in staging (custom middleware flag). | Harder debugging on staging. |
| `correlation-only` | Add request id | Return opaque id in prod; logs hold stack server-side. | Best UX + security; needs logging pipeline. |

## Current selection (this repo)

- [ ] `standard-node-env`
- [ ] `always-minimal`
- [ ] `correlation-only`

**Notes:**

## Implementation backlog

- [ ] Audit containers/systemd for `NODE_ENV`.

## Related

- `a2a-server/src/middleware/error.middleware.ts`

## Open questions

- …
