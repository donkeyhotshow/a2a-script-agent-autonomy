# Task 38: Pipeline observability and metrics (server + client)

## Goal

Add structured **observability** across the full request pipeline:

`Web → Client API → a2a-server → External AI Hub → a2a-server → Client API → Web`

with a focus on:

- Latencies and error rates for each stage (`request.json → request.md → LLM → response.md → response.json`).
- LLM usage metrics (tokens, calls).
- Action frequency and success/failure rates (per `execute.<action>`).

## Background

Current docs (`SERVER-ARCHITECTURE.md`, `DATA-FLOW.md`) describe the flow, but there is no unified, simulation-aware metrics story. For refactors around simulations/engine, we need to confidently see:

- Where time is spent (transforms vs LLM vs client actions).
- Which simulations / actions are most expensive or flaky.

## Requirements

- **1. Correlation IDs and basic tracing**
  - Generate a **correlationId** per server request (mapped from Client API request id / session id when present).
  - Propagate it through:
    - a2a-server logs (request processor, transforms, LLM adapter),
    - External AI Hub calls (as header/metadata),
    - Client API logs (session manager, execute engine).
  - Ensure all logs include correlationId so traces can be followed end-to-end.

- **2. Stage-level timing + error logging**
  - In a2a-server, capture at least:
    - time to run request transform (`server-transforms-request`),
    - time to call LLM / replay,
    - time to run response transform (`server-transforms-response`),
    - time spent in request storage / DB.
  - Log structured records per request:
    - `{ correlationId, action, step, stage, durationMs, success, errorType? }`.
  - In Client API, log:
    - time from Web request to server call and back,
    - time to execute client actions (`read-file`, `write-file`, `rag-search`, `execute-command`, etc.).

- **3. LLM usage metrics**
  - For each LLM interaction:
    - record prompt/response sizes (chars or tokens if available from provider),
    - track total LLM calls per request/session,
    - optionally expose aggregate stats (per action type, per simulation).
  - Integrate with whatever metric backend is already used (or start with simple in-process counters / logs).

- **4. Action usage and health**
  - Count how often each `execute.<action>` type is:
    - emitted by server,
    - successfully executed by client,
    - fails (with error category).
  - Provide a small report or dashboard-ready structure (e.g. JSON endpoint or log series) summarizing:
    - top actions by count,
    - failure rates,
    - average latency per action type.

- **5. Simulation-aware metrics**
  - When a request is associated with a simulation (via env, context flag, or replay dir), tag metrics with:
    - `simulationName`, `simulationStep`.
  - This allows:
    - quickly seeing which simulations regress after engine changes,
    - cross-checking golden tests vs live metrics.

## Acceptance Criteria

- For any given request (live or simulation-replay), it’s possible to:
  - follow a trace via correlationId across server + client logs,
  - see a breakdown of timings per pipeline stage and LLM calls,
  - inspect which actions were executed and how long they took.
- Basic counters/metrics exist for:
  - LLM calls, latency, and (if possible) token usage,
  - per-action execution counts and error rates.

## References

- `docs/new-request-flow/DATA-FLOW.md`
- `docs/new-request-flow/SERVER-ARCHITECTURE.md`
- `a2a-server/src/services/request-processor.service.ts`
- `a2a-server/src/services/ai/llm-adapter.ts`
- `a2a-client/packages/api-client/src/index.ts`
- `a2a-client/packages/api-server` (Client API)

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 38) and mapped the observability requirements for correlation IDs, stage timing, LLM metrics, and action health counters.
- 📌 Instrumentation notes captured so the request processor, execute engine, and telemetry pipeline can be aligned when the sprint for metrics begins.
- 📝 Next steps: design the correlationId propagation plus stage timers/metrics reporting in the server + Client API and plan the dashboard/reporting surface before implementation.
