# SDK session transform: `any` on server payloads

**File:** `a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts`

**Problem:** `serverResponse: any`, `statusResponse: any`, history/message mappers use `(h: any)`, `(m: any)`.

**Done when:** Types aligned with invoke/Client API DTOs; narrow filters without `any`.
