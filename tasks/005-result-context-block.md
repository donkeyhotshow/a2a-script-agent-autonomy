# Task 005: Result — full context block for client

**Index:** [tasks/README.md](README.md) | **Depends:** [004-processor-graph.md](004-processor-graph.md)

---

## Problem

Request API result returns `{ outcome, message, context, questions, index_answers }`. Flow doc TODO: result should return context block for client: `tasks`, `request_files`, `architectural_features`.

## Solution

Ensure `updateStatus(completed, result)` includes in result:
- `context.tasks`
- `context.request_files` (from neurons)
- `context.architectural_features`
- `context.activated_neurons` (ids or names)

Client uses these for next iteration (send requested files, show features).

## Files

- [request-processor.service.ts](../a2a-server/src/services/request-processor.service.ts)
- [request.service.ts](../a2a-server/src/services/request.service.ts)
- [requests.routes.ts](../a2a-server/src/routes/requests.routes.ts)

## Reference

[flow-graph-requests.md](../docs/flow-graph-requests.md) §6 TODO

## Verification

POST /requests. GET result. Response should include `context.request_files` when neurons activated.

## Prev / Next

← [004](004-processor-graph.md) | → [006](006-chatgpt-integration.md)
