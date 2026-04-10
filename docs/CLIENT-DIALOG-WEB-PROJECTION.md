# Dialog → web projection and session protocol (pain points)

**Purpose:** Capture why the browser experience and scripted drivers feel **non-obvious** and sometimes **fragile**, so we can align on terminology and desired behavior before changing code.

## 1. Dialog projected onto web

The product flow is authored as a **dialog pipeline** (classify → router → agent/tools → results). The web UI does **not** show the raw A2A `execute` action keys for many steps: the Client API exposes a **Web DTO** where tool actions are stripped and replaced with `execute.message`, `execute.form`, and `execute.attachments` (see [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) § *Web DTO*).

**Consequences:**

- **Hidden mechanics** — Operators and integrators who read server sims or logs see `read-file` / `rag-search` keys; the same step in the browser looks like status text + attachments. Mental model must bridge two shapes.
- **Router is a second “language”** — The first user input is free text; the next step may require a **choice id**, not text. The top-level `task` field is **overloaded** (`message` vs `choice` depending on prior `form.choices`). Easy to script wrong without re-reading `GET …/sessions/{id}` each time ([`AGENTS.md`](../AGENTS.md) *Router dialog (two beats)*).
- **Stage vs raw step** — UI stage (`routing`, etc.) is derived from `execute.form` + `context.execution`, not a single stable server field; debugging “what state am I in?” requires knowing the projection rules ([`session-stage-machine.js`](../a2a-client/packages/vite-plugin/routes/utils/session-stage-machine.js)).

## 2. Session protocol instability (operator view)

Normative flow is **create → `POST …/next` → poll `GET …/async` → re-hydrate `GET …/sessions/{id}`** ([`WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md), [`OPERATOR-CURL.md`](OPERATOR-CURL.md)).

**Why it feels unstable:**

- **Ack vs truth** — `/next` returns a minimal ack; full state is on GET session. Scripts that only read the ack miss `execute` / errors / next required input shape.
- **Async surface** — `asyncPending`, `promiseStatus`, and `/async`’s `status` are related but not identical names; polling discipline must be consistent (no wall-clock “give up” on poll loops per project policy).
- **Deployment split** — Vite storage-mode responses vs SDK `{ success, session }` and `unwrap` ([`ADR-0028`](adr/ADR-0028-client-api-deployment-modes.md)) add another axis when the same mental model is reused across curl, UI, and SDK.
- **Normalization** — Router submits accept multiple spellings (`normalizeRouterStepSubmit`); behavior is helpful for humans but **non-obvious** for strict scripts unless documented test vectors exist.
- **`GET …/async` errors** — For `status` `failed` / `error`, the Client API returns a **minimal** `result` (status + optional `retryAfter` when recoverable) and omits projected `execute`, so polling does not re-stream large error bodies; `server-promise.json` is compacted the same way. Full details remain on the A2A server / logs for investigation.

## 3. Open alignment (answer in follow-up)

Questions for the product/owner are listed in the chat after this document is added; answers should drive whether we invest in **clearer UI affordances**, **stricter machine-readable session state**, **fewer overloads**, or **better operator tooling** only.

## References

| Doc | Role |
|-----|------|
| [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) | Web DTO, `/next`, `/async`, router |
| [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) | Curl driver checklist |
| [`AGENTS.md`](../AGENTS.md) | Two-beat router, `buildSubmitResult` behavior |
| [`docs/adr/ADR-0028-client-api-deployment-modes.md`](adr/ADR-0028-client-api-deployment-modes.md) | Vite vs SDK response shapes


# Dialog / LLM promise deferral (A2A Server)

Normative behavior for **server-issued `promiseId`** rows stored under `a2a-server` request storage (polled via `GET /api/v1/requests/:id/status|result` and surfaced by the Client API as session async state).

## Requirements

1. **Same promise, non-terminal errors**  
    For requests routed to the **dialog** processor (transform / LLM pipeline: dialog, agent, task-decomposition, etc.), if processing fails because the hub is down, transforms fail, LLM init/fetch fails, or recovery after restart fails, the server **must not** immediately mark the request **`failed`** when recovery is plausible.

2. **Re-queue with backoff**  
    In those cases the server **re-queues** the **same `promiseId`**: status returns to **`pending`**, with **`retryAfter`** set (see env). The background processor picks it up again only after the backoff (see implementation: pending listing and `claimPendingByPromiseId` both honor `retryAfter`).

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

### Hub response body shape (recovery / poll)

If `GET /promise/:id/response` returns **non-Local LLM upstream** JSON (e.g. A2A-shaped `execute` / `step`, or another provider envelope), the server must still treat the promise as **ready** with a non-empty body. Previously, extracting only `message.content` / `response` and returning empty led to **resubmit**, clearing `context.llmPromiseId` and issuing **new** `POST /api/chat?promise=1` while the hub had already completed — see `hubLlmResubmitCount` on the request row. Implementation: `extractLlmTextFromHubResponseBody` in [`a2a-server/src/daemon/llm-hub-poll.ts`](../a2a-server/src/daemon/llm-hub-poll.ts). **2026-04-06:** empty extract → spurious resubmit and duplicate `POST …?promise=1` while the hub had already completed — use `hubLlmResubmitCount` on the request row to spot this class (former note in removed root `BREAK_STATE.md`).