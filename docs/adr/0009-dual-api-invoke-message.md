# ADR 0009: Dual API — /invoke and /message

## Status

accepted

## Date

2026-02-20

## Context

Legacy endpoints vs Requests API. Client may send `code_blocks` or `codeBlocks`.

## Decision

- `POST /api/v1/invoke` and `POST /api/v1/message` — both create Request via `requestService.create()`, return `promiseId`
- Body: `context`, `message`, `code_blocks` (snake_case)
- `POST /api/v1/requests` — primary API, uses `codeBlocks` (camelCase)
- All three feed the same RequestProcessor

## Consequences

- Backward compatibility for clients using invoke/message
- Field name inconsistency: `code_blocks` vs `codeBlocks` — request.service normalizes
