# A2A Server daemons (background work)

| Module | Responsibility |
|--------|----------------|
| [`llm-hub-poll.ts`](./llm-hub-poll.ts) | Poll AI Hub until LLM promise is ready; fetch markdown/text response. |
| [`request-processor.service.ts`](../services/core/request-processor/request-processor.service.ts) | `setInterval` queue tick: dequeue pending requests, run processors, recover stuck `llmPromiseId` after restart. |

Downstream pollers (not daemons here): Client API polls `/api/v1/requests/:id/result`; browser polls `/api/a2a/sessions/:id/promise/:promiseId`.
