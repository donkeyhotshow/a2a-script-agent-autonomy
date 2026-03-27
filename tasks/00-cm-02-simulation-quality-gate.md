# CM-02: Align Simulation Quality Gate

## Status
- [x] Done

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

## Result
- Unified rule fixed: `valid` = structural pass; `clean` = `valid` + `0` warnings.
- Added dedicated gate command: `a2a-server npm run sim:quality` (also exposed as root `npm run sim:quality`).
- CI workflow `simulations-ci.yml` now runs the same gate command in `quality-gate` job.
- Updated simulation docs (`simulations/README.md`, `simulations/SERVER-CONTRACT.md`) with the single acceptance rule.