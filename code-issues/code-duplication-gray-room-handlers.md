# Code Duplication: Gray Room Interrupt Handler Signatures

## Description
All gray room interrupt handlers have nearly identical function signatures and return types, with similar logic for context manipulation, tracing, and continuation flags. This indicates a template-like duplication for handling different interrupt types.

## Impact
Code is repetitive for adding new handlers, and changes to the interface (e.g., adding parameters) would require updates across multiple files.

## Files Involved
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/auto-read-file.ts` (lines 9-36)
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/auto-rag-page.ts` (lines 9-23)
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/thinking.ts`
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/compress-history.ts`
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/algorithm-invoke.ts`
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/clarify.ts`

## Duplicated Pattern
Function signature: `handleX(interrupt, ctx, promiseId, aiHubUrl, model, trace)`; returns `{ nextCtx, continueLoop }`.
Handler functions consistently start with `let nextCtx: GrayRoomContext = { ...ctx };` and end with trace pushes and return statements.

## Recommendation
Define a base class or interface for interrupt handlers to enforce the structure and reduce duplication.