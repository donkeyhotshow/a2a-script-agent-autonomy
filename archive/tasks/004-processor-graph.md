# Task 004: Processor — add entity recognition + graph

**Index:** [tasks/README.md](README.md) | **Flow:** [docs/flow-graph-requests.md](docs/flow-graph-requests.md)

---

## Problem

[request-processor.service.ts](a2a-server/src/services/request-processor.service.ts) does NOT do entity recognition or graph. Flow doc describes: `recognizeEntitiesBatch` → `buildAndStoreGraph` → `isGraphIncomplete`. Actual: only `processNewTaskToContext` → semantics → questions → index.

## Solution

Add to `processOneRequest`:
1. `recognizeEntitiesBatch(codeBlocks)` when codeBlocks present
2. `getGraph(project_path)` → merge → `buildAndStoreGraph`
3. `isGraphIncomplete(project_path)` → outcome `graph_incomplete` + question when needed

## Files

- [request-processor.service.ts](../a2a-server/src/services/request-processor.service.ts)
- [entity-recognizer.ts](../a2a-server/src/knowledge/entity-recognizer.ts)
- [graph-store.ts](../a2a-server/src/knowledge/graph-store.ts)

## References

- [flow-graph-requests.md](../docs/flow-graph-requests.md) §2.3, §4
- [LOADING.md](../LOADING.md) — entity types, relations

## Verification

POST with codeBlocks (model, controller). Result should include entities, relations, or `graph_incomplete` + question.

## Next

→ [005-result-context-block.md](005-result-context-block.md)
