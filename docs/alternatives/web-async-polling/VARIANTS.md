# Web UI async polling — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **Transport ids stay server-side** for the recommended web path: browser should not depend on holding `promiseId` for routine dialog (see `a2a-client/docs/WEB_UI_PROTOCOL.md`).

## Context

After `POST .../sessions/:id/next`, async work may be in flight. The Client API can expose **session-scoped** polling or **legacy promise URL** polling. Choose what the web app and SDK must implement.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `session-async` | `GET .../sessions/:id/async` | Preferred web poll; no id in URL beyond session. | `WEB_UI_PROTOCOL.md`, storage-mode Vite plugin. |
| `promise-url` | `GET .../promise/:promiseId` | Legacy / tooling; explicit transport id. | Still supported; some non-storage clients. |
| `sdk-only-promise` | SDK lacks `/async` | Poll server `requests/:id/result` or promise route only. | Per ADR-0028 note on SDK parity. |

### `session-async`

- **Use when:** Vite storage Client API, minimal UI state.
- **Cost / risk:** Client API must implement route and daemon behavior.
- **Status:** candidate

### `promise-url`

- **Use when:** debugging, older clients, explicit correlation.
- **Cost / risk:** leaks transport concern into UI if required.
- **Status:** candidate

### `sdk-only-promise`

- **Use when:** SDK not yet aligned with `/async`.
- **Cost / risk:** document clearly in `AGENTS.md` “SDK may differ”.
- **Status:** candidate

## Current selection (this repo)

- [ ] `session-async`
- [ ] `promise-url`
- [ ] `sdk-only-promise`

**Where it applies:** web vs SDK consumers

**Notes:**

## Implementation backlog

- [ ] Close parity gap: SDK exposes `/async` if you standardize on `session-async` everywhere.

## Related

- ADR: [`docs/adr/ADR-0025-decouple-promise-from-ui.md`](../../adr/ADR-0025-decouple-promise-from-ui.md), ADR-0028
- Code: `a2a-client/web/js/...`, `a2a-client/vite-plugin-a2a/`

## Open questions

- …
