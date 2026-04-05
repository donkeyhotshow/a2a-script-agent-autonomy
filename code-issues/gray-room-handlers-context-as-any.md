# Gray room / interrupt handlers: `as any` on context

**Files (representative):**
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/algorithm-invoke.ts`
- `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/compress-history.ts`
- `a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts` (`REVIEW_RESULT` as any)

**Problem:** Context and history accessed via `(nextCtx['context'] as any)` / `as any[]` — bypasses contract typing.

**Done when:** Shared narrow types for working context in gray room pipeline; remove casts.
