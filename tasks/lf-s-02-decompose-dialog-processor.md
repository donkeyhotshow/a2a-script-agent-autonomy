# LF-S-02: Decompose dialog-request-processor.ts

## Problem
`src/services/core/request-processor/dialog-request-processor.ts` is ~781 lines.

## Solution
Split into:
- `dialog-request-processor/normalization.ts` - Request normalization
- `dialog-request-processor/llm-orchestration.ts` - LLM step orchestration
- `dialog-request-processor/response-path.ts` - Finalize response path

## Where
- File: `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`

## Verification
```bash
cd a2a-server && npm run test -- --grep dialog
```
