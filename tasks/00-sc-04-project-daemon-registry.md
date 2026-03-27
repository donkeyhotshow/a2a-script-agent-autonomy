# SC-04: Project Daemon Registry

## Status
- [ ] Open

## Description
Mirror daemon clarity pattern for sessions via `session-background-registry.js` keyed by `projectId + sessionId` (pollers, timers, status).

## Details
- Создать session-background-registry.js
- Key: projectId + sessionId
- Управление: pollers, timers, status
- Паттерн аналогичен daemon clarity

## Source
- [a2a-client/DEV_STATE.md:222](../a2a-client/DEV_STATE.md)

## Owner
a2a-client background processes

## Verification
- Registry создан и работает
- Ключ projectId + sessionId работает
- Pollers/timers/status управляются