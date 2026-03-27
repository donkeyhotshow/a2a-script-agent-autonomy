# SC-01: Session View Model Adapter

## Status
- [ ] Open

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
- Адаптер создан и работает
- Все формы маппится корректно
- UI state соответствует received.json