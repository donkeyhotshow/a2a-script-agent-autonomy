# CM-01: Keep Root/Module State Hierarchy Clean

## Status
- [ ] Open

## Description
Keep root/module state hierarchy clean: root stores only cross-module risks, decisions, and dependencies; implementation details stay in module `DEV_STATE.md`.

## Details
- Root DEV_STATE.md должен содержать только кросс-модульные риски, решения и зависимости
- Детали реализации остаются в модульных DEV_STATE.md файлах
- Избегать дублирования backlog-задач между root и модулями

## Source
- [DEV_STATE.md:285](../DEV_STATE.md)

## Owner
Root state governance

## Verification
- Root DEV_STATE.md содержит только кросс-модульные факты
- Нет дублирующих задач в модульных файлах
- Links ведут на существующие файлы