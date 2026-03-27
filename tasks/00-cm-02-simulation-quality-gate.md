# CM-02: Align Simulation Quality Gate

## Status
- [ ] Open

## Description
Align simulation quality gate across modules (`valid` vs `clean`) and publish one acceptance rule for CI.

## Details
- Определить единый критерий качества симуляций для всех модулей
- `valid` = структурно корректно
- `clean` = валидно без warnings
- Опубликовать правило для CI pipeline

## Source
- [DEV_STATE.md:286](../DEV_STATE.md)

## Owner
Cross-module CI/CD governance

## Verification
- Единое правило принято для всех модулей
- CI использует согласованный критерий
- Документация обновлена