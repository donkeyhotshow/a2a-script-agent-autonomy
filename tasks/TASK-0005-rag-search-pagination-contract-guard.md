## TASK-0005-rag-search-pagination-contract-guard

### Problem
The golden contract for `rag-search` uses an action-key result shape with pagination semantics (e.g. `page`, `hasMore`, and a result window).

If `RagSearchProtocolResult` ever changes or if downstream code forgets to forward these fields, multi-page flows drift and can break “sequential multi-round” sims.

### Golden invariant
From `simulations/SCHEMA.md`:
- `result["rag-search"]` must use action-key shape
- pagination fields like `hasMore` must be present and boolean-correct

### Scope (client + protocol)
- `a2a-client/packages/rag/src/protocol-rag-search.ts`
- any adapter that converts searcher output into `result["rag-search"]`

### Target change
Add:
- runtime shape assertions (or TypeScript constraints) in the protocol builder (`toRagSearchResult` equivalent)
- small unit test that fails if `hasMore` is missing or not boolean

### Acceptance criteria
- No simulation fixture changes required.
- `a2a-client/packages/rag` unit tests pass.

