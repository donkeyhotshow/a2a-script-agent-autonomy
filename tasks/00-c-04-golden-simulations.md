# C-04: Golden Simulations Client Checklist

## Status
- [x] Open

## Description
Add client-focused simulation checklist for sanitized web DTOs (`execute` must stay web-safe).

## Details
- Добавить checklist для golden simulations на стороне клиента
- Проверять что execute остаётся web-safe
- Санитизация DTOs для клиентского использования

## Source
- [a2a-client/DEV_STATE.md:186](../a2a-client/DEV_STATE.md)

## Owner
a2a-client simulations

## Verification
- Checklist создан и используется
- DTOs санитизированы корректно
- web-safe проверено

## Done
- Added `a2a-client/docs/GOLDEN-SIMULATIONS-CHECKLIST.md` with concrete web-safe DTO checks.
- Linked checklist in `a2a-client/docs/README.md` and `simulations/SCHEMA.md` so it is part of authoring flow.