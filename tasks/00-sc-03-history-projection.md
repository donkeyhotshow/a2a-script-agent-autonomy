# SC-03: History Projection Boundary

## Status
- [x] Done

## Description
Add `history-projection.js` that accepts only canonical server payload (`context.history`, `context.files`, `workbench`) and emits deterministic timeline records with mandatory support for `system` role entries.

## Details
- Создать history-projection.js
- Принимает canonical server payload: context.history, context.files, workbench
- Эмитирует deterministic timeline records
- Обязательная поддержка system role entries

## Source
- [a2a-client/DEV_STATE.md:221](../a2a-client/DEV_STATE.md)

## Owner
a2a-client timeline/history

## Verification
- Projection работает корректно
- System role entries сохраняются
- Timeline deterministic