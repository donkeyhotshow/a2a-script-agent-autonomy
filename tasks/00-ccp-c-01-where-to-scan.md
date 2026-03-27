# CCP-C-01: Code Cleanup Where To Scan

## Status
- [x] Done

## Description
Primary folders: `web/js/`, `vite-plugin-a2a/routes/`, `vite-plugin-a2a/routes/utils/`, `packages/sdk/src/server/server/routes/`.

## Details
- Определить primary folders для cleanup scans
- web/js/, vite-plugin-a2a/routes/, vite-plugin-a2a/routes/utils/, packages/sdk/src/server/server/routes/
- Focus на hotspots, не broad random search

## Result
- Primary folders зафиксированы в `a2a-client/DEV_STATE.md` (`CCP-C-01 where-to-scan`).
- Стартовый scan выполнен по указанным папкам; большие и сложные файлы уже отражены в задачах `LF-C-01..LF-C-06` и в блоке cleanup discovery.

## Source
- [a2a-client/DEV_STATE.md:248](../a2a-client/DEV_STATE.md)

## Owner
a2a-client code cleanup

## Verification
- Folders определены
- Scan запущен
- Результаты документированы