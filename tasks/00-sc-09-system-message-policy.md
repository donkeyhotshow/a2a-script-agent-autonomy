# SC-09: System Message Policy

## Status
- [x] In Progress
- [x] Completed (2026-03-27)

## Description
Define and implement Web UI policy for `system` messages (Red Room auto-responses): rendering style, ordering in timeline, and non-lossy persistence in `messages.json`.

## Details
- [x] Определить policy для system messages
- [x] Red Room auto-responses имеют определённый rendering style (CSS `.task-flow-message.system`)
- [x] Ordering в timeline сохраняется (хронологическая последовательность из step slices)
- [x] Non-lossy persistence в messages.json (normalizeMessage сохраняет role)

## Implementation
- **Rendering**: CSS `.task-flow-message.system` с orange accent border (#ff9800), light orange background (#fff3e0), 🤖 emoji prefix
  - Файл: `a2a-client/web/css/components/task-flow.css:200-214`
  - Role label "System" отображается в заголовке
- **Filtering**: Telemetry-only errors (metadata.type === 'error' || severity in {'error','warning'}) скрыты из timeline но хранятся
  - Файл: `a2a-client/web/js/task-flow/render.js:43-48` (isSystemErrorChatMessage)
- **Ordering**: Хронологическая последовательность из step slices, system сохраняет позицию относительно user/assistant
  - Файл: `a2a-client/web/js/session-data.js:325-336` (applyServerMessages)
- **Persistence**: Все роли сохраняются в messages.json slice per step
  - Файл: `a2a-client/web/js/utils/normalizers.js:28-40`

## Documentation
- [a2a-client/docs/WEB_UI_PROTOCOL.md:159](a2a-client/docs/WEB_UI_PROTOCOL.md#system-messages-red-room-auto-responses)
- [a2a-client/DEV_STATE.md:226](a2a-client/DEV_STATE.md) - SC-09 marked as completed