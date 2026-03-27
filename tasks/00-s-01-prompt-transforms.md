# S-01: Server Prompt Transforms Lock

## Status
- [ ] Open

## Description
Lock transform loading mode (bundled defaults vs `PROMPTS_TRANSFORMS_PATH`) and add startup diagnostics.

## Details
- Определить режим загрузки трансформов: bundled defaults vs PROMPTS_TRANSFORMS_PATH
- Добавить startup diagnostics
- Зафиксировать решение

## Source
- [a2a-server/DEV_STATE.md:169](../a2a-server/DEV_STATE.md)

## Owner
a2a-server transforms

## Verification
- Решение зафиксировано
- Startup diagnostics работают
- Режим используется корректно