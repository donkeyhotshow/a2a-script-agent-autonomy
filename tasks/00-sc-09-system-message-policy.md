# SC-09: System Message Policy

## Status
- [x] Completed

## Description
Define and implement Web UI policy for `system` messages (Red Room auto-responses): rendering style, ordering in timeline, and non-lossy persistence in `messages.json`.

## Details
- Определить policy для system messages
- Red Room auto-responses должны иметь определённый rendering style
- Ordering в timeline должен сохраняться
- Non-lossy persistence в messages.json

## Source
- [a2a-client/DEV_STATE.md:226](../a2a-client/DEV_STATE.md)

## Owner
a2a-client UI/timeline

## Verification
- Policy определена и документирована (см. `a2a-client/docs/WEB_UI_PROTOCOL.md`)
- Rendering `system` сообщений использует отдельный стиль в Web UI (`task-flow-message system`)
- System messages сохраняются и читаются из `messages.json` без потерь и без изменения порядка