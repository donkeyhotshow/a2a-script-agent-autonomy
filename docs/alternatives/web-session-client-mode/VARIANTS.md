# Web SessionStore client mode — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- `SessionStore` only accepts **`storage`** or **`project`** for `storageMode` (`a2a-client/web/js/session-store.js`). `storageBase` must stay a non-empty string (default `/api/a2a/sessions`).

## Context

The web UI can treat sessions as **global Client API storage** or as **project-scoped** workflows. Same backend routes may behave differently regarding project binding and file layout expectations.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `storage` | Storage mode | Default in `WEB_SESSION_STORE_OPTIONS`; file-backed KV + step dirs under Client API root. | Matches `WEB_UI_PROTOCOL.md` “storage mode”. |
| `project` | Project mode | Sessions tied to project context (paths, listing). | Use when UI is always workspace-centric. |

### `storage`

- **Use when:** generic dialog lab, multi-project picker inside one Client API.
- **Cost / risk:** must understand `storage/kv` + session folders.
- **Status:** candidate

### `project`

- **Use when:** IDE-like flow fixed to one repo root.
- **Cost / risk:** project store must be consistent with session APIs.
- **Status:** candidate

## Current selection (this repo)

- [ ] `storage`
- [ ] `project`

**Where it applies:** web only (SDK may not expose both the same way)

**Notes:**

## Implementation backlog

- [ ] Document in `a2a-client/docs/WEB_UI_PROTOCOL.md` cross-link if project mode gains first-class examples.

## Related

- `a2a-client/web/js/session-store.js`, `window-state.js` (must pass same options)
- `a2a-client/docs/WEB_UI_PROTOCOL.md`

## Open questions

- …
