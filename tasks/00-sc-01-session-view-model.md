# SC-01: Session View Model Adapter

## Status
- [x] Completed

## Description
Introduce `session-view-model.js` as single adapter from `received.json` shapes to UI state (`choice-form`, `input-form`, `message+form`, `message-only`, `completed`).

## Details
- Создать единый адаптер session-view-model.js
- Маппинг из received.json в UI state
- Поддержка форм: choice-form, input-form, message+form, message-only, completed

## Source
- [a2a-client/DEV_STATE.md:219](../a2a-client/DEV_STATE.md)

## Owner
a2a-client UI architecture

## Verification
- Адаптер `session-view-model.js` создан
- Юнит-тесты покрывают режимы choice-form, input-form, message+form, message-only, completed
- UI view model корректно следует за формой и статусом протокола в received.json