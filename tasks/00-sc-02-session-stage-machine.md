# SC-02: Session Stage Machine

## Status
- [x] Done

## Description
Add explicit `session-stage-machine.js` (`routing`, `dialog-input`, `agent-tool-loop`, `awaiting-async`, `completed`) driven by `execute` + `context.execution`.

## Details
- Создать явную машину состояний сессии
- Состояния: routing, dialog-input, agent-tool-loop, awaiting-async, completed
- Драйв от execute + context.execution

## Source
- [a2a-client/DEV_STATE.md:220](../a2a-client/DEV_STATE.md)

## Owner
a2a-client session flow

## Verification
- Машина состояний создана
- Переходы работают корректно
- State соответствует execute/context