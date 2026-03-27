# SC-07: Step Routes Split By Flow

## Status
- [ ] Open

## Description
Split `stepRoutes.js` by flow ownership: `router-flow`, `dialog-flow`, `agent-flow`, `async-flow`, then keep one composition root.

## Details
- Разделить stepRoutes.js по flow ownership
- router-flow, dialog-flow, agent-flow, async-flow
- Сохранить один composition root

## Source
- [a2a-client/DEV_STATE.md:224](../a2a-client/DEV_STATE.md)

## Owner
a2a-client routes architecture

## Verification
- Routes разделены по flow
- Composition root работает
- Все flows функционируют