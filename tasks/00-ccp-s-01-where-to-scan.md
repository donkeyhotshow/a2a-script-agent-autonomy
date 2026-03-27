# CCP-S-01: Code Cleanup Where To Scan

## Status
- [x] Done

## Description
Primary folders: `src/transform/`, `src/services/core/request-processor/`, `src/actions/handlers/`, `scripts/`.

## Details
- Определить primary folders для cleanup scans
- src/transform/, src/services/core/request-processor/, src/actions/handlers/, scripts/
- Focus на hotspots, не broad random search

## Source
- [a2a-server/DEV_STATE.md:232](../a2a-server/DEV_STATE.md)

## Owner
a2a-server code cleanup

## Verification
- Folders определены (`src/transform/`, `src/services/core/request-processor/`, `src/actions/handlers/`, `scripts/`)
- Scan scope зафиксирован в `a2a-server/DEV_STATE.md` (`CCP-S-01 where-to-scan`)
- Результаты первого прохода будут уточняться в задачах `CCP-S-02+`