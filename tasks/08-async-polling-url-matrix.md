# Task 08: Async Polling URL Matrix

## Atomic update action
Update WEB_UI_PROTOCOL.md with complete async URL matrix covering all consumers and complete the SessionStoreResolver documentation.

## Reason
Async polling currently documented in WEB_UI_PROTOCOL.md but misses SDK AsyncClient path and doesn't document SessionStoreResolver pattern.

## Affected files
- `a2a-client/docs/WEB_UI_PROTOCOL.md`
- `a2a-client/web/js/session-store-resolver.js`

## Validation checklist
- Document three consumer paths: A2A Server, Vite Client API, SDK AsyncClient
- Document SessionStoreResolver API: registerProvider(), resolve()
- Add complete URL matrix in tabular form with examples

## Note
This is a documentation task - no code changes required. The code already supports all three patterns.