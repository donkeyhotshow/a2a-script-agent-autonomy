# RF-C-01: Redundant Functionality Inventory

## Status
- [x] Done (2026-03-27)

## Description
Build inventory of session-related modules and mark overlap (same responsibility implemented in 2+ places).

## Details
- Инвентаризация session-related модулей
- Выявление overlap (same responsibility в 2+ местах)
- Маркировка кандидатов на удаление

## Source
- [a2a-client/DEV_STATE.md:235](../a2a-client/DEV_STATE.md)

## Owner
a2a-client code cleanup

## Verification
- Инвентаризация создана
- Overlap идентифицирован
- Кандидаты помечены

## Evidence
- Inventory artifact: [`a2a-client/docs/SESSION-REDUNDANCY-INVENTORY.md`](../a2a-client/docs/SESSION-REDUNDANCY-INVENTORY.md)
- Overlap categories documented: role normalization, async pending detection, stage/view-model classification, message projection
- Removal/consolidation candidates marked with safe-action notes (extract helper, reuse canonical scanner, keep abstraction boundaries)