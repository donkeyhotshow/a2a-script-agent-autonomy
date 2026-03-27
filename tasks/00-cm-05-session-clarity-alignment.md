# CM-05: Track Client Session-Clarity Alignment

## Status
- [x] Open

## Description
Track client session-clarity alignment with simulation contracts (`simulations/dialog`, `simulations/agent-auto-ai`) and ensure no Web DTO regressions.

## Details
- Проверять соответствие client session storage с симуляционными контрактами
- simulations/dialog, simulations/agent-auto-ai должны быть согласованными
- Обеспечить отсутствие регрессий в Web DTO

## Source
- [DEV_STATE.md:289](../DEV_STATE.md)

## Owner
Client session architecture

## Verification
- Контракты согласованы
- Регрессионные тесты проходят
- Client storage соответствует симуляциям

## Evidence
- `cd a2a-client && npx vitest run tests/unit/web-execute-dto-contract.test.mjs tests/unit/session-view-model.test.mjs tests/unit/history-projection.test.mjs` → 17/17 passed
- `cd a2a-server && npm run sim:validate -- --sim dialog/1 --json`
- `cd a2a-server && npm run sim:validate -- --sim dialog/2 --json`
- `cd a2a-server && npm run sim:validate -- --sim agent-auto-ai/5 --json`
- `cd a2a-server && npm run sim:validate -- --sim agent-auto-ai/6 --json`
- `cd a2a-server && npm run sim:validate -- --sim agent-auto-ai/7 --json`