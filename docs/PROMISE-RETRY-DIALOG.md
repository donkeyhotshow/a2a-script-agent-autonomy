# Dialog / LLM promise deferral (A2A Server)

Normative behavior for **server-issued `promiseId`** rows stored under `a2a-server` request storage (polled via `GET /api/v1/requests/:id/status|result` and surfaced by the Client API as session async state).

## Requirements

1. **Same promise, non-terminal errors**  
   For requests routed to the **dialog** processor (transform / LLM pipeline: dialog, agent, task-decomposition, etc.), if processing fails because the hub is down, transforms fail, LLM init/fetch fails, or recovery after restart fails, the server **must not** immediately mark the request **`failed`** when recovery is plausible.

2. **Re-queue with backoff**  
   In those cases the server **re-queues** the **same `promiseId`**: status returns to **`pending`**, with **`retryAfter`** set (see env). The background processor and sync `/invoke` wait chain pick it up again only after the backoff (see implementation: pending listing and `claimPendingByPromiseId` both honor `retryAfter`).

3. **Poll until terminal**  
   Clients **continue polling** until status is **`completed`** or **`failed`**. During deferral, status stays **`pending`** or **`processing`** — not a final failure — so `server-promise.json` must not show **`failed`** solely because of a transient LLM/hub/transform error.

4. **Explicit validation stays terminal**  
   Failures that are not “fix infra and retry” — currently **`transformSchema required`** — are **not** deferred; they may complete as **`failed`** immediately (bad/unsupported request shape).

5. **Bounded retries**  
   Deferral is bounded by **`REQUEST_MAX_RETRIES`**. After the cap, the server marks the request **`failed`** as before.

6. **Startup recovery**  
   If a row was left **`processing`** with an LLM promise and **recovery** of that LLM promise fails with a deferrable dialog error, the same deferral/retry policy applies instead of an immediate **`failed`** where possible.

## Environment

| Variable | Role |
|----------|------|
| `REQUEST_RETRY_DELAY_MS` | Delay before a deferred request is eligible again (default 15000). |
| `REQUEST_MAX_RETRIES` | Max automatic re-queues per `promiseId` (default 15, capped in code). |
| `AUTO_RETRY_FAILED_AFTER_MS` | Optional revival of **already failed** timeout/network-like rows after cooldown (separate path; see `request.service.ts`). |

## Implementation (reference)

- `a2a-server/src/services/core/request/request.service.ts` — `shouldDeferDialogProcessorFailure`, `scheduleRetry`, `listPending` / `claimPendingByPromiseId` (`retryAfter`).
- `a2a-server/src/services/core/request-processor/request-processor.service.ts` — `executePendingRow` (dialog failures → `scheduleRetry`), `recoverProcessingRequests` (deferrable recovery failures).

## Relation to AI Integration promises

The AI hub exposes its own LLM `promiseId` for `/api/chat?promise=1`. That is **orthogonal** to the A2A Server file-queue row: the server still tracks **one** primary `promiseId` per invoke; deferral applies to that row when the dialog pipeline cannot finish yet.
