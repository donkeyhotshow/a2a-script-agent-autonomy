# Browser localStorage for storage mode — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Key **a2a_storage_mode** in **localStorage** persists the header **storageModeSelect** value **project** or **storage** (`a2a-client/web/js/app/event-handlers.js`).

## Context

Single-user dev benefits from remembering the last mode; shared kiosks may want a fixed default each load (would need a small code change).

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `remember` | Current | Restore last mode from localStorage. | Default UX. |
| `force-storage` | Policy | Always storage unless code clears key. | Shared machines; implement explicitly. |
| `origin-scoped` | Implicit | Different origins remember separately. | Standard browser model. |

## Current selection (this repo)

- [ ] `remember`
- [ ] `force-storage`
- [ ] `origin-scoped`

**Notes:**

## Implementation backlog

- [ ] Optional setting to ignore saved mode.

## Related

- `docs/alternatives/web-session-client-mode/VARIANTS.md`
- `a2a-client/web/js/app/event-handlers.js`

## Open questions

- …
