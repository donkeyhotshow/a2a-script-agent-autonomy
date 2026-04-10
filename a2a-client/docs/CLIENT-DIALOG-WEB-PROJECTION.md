# Dialog → web projection and session protocol (pain points)

**Purpose:** Capture why the browser experience and scripted drivers feel **non-obvious** and sometimes **fragile**, so we can align on terminology and desired behavior before changing code.

## 1. Dialog projected onto web

The product flow is authored as a **dialog pipeline** (classify → router → agent/tools → results). The web UI does **not** show the raw A2A `execute` action keys for many steps: the Client API exposes a **Web DTO** where tool actions are stripped and replaced with `execute.message`, `execute.form`, and `execute.attachments` (see [`WEB_UI_PROTOCOL.md`](WEB_UI_PROTOCOL.md) § *Web DTO*).

**Consequences:**

- **Hidden mechanics** — Operators and integrators who read server sims or logs see `read-file` / `rag-search` keys; the same step in the browser looks like status text + attachments. Mental model must bridge two shapes.
- **Router is a second “language”** — The first user input is free text; the next step may require a **choice id**, not text. The top-level `task` field is **overloaded** (`message` vs `choice` depending on prior `form.choices`). Easy to script wrong without re-reading `GET …/sessions/{id}` each time ([`AGENTS.md`](../AGENTS.md) *Router dialog (two beats)*).
- **Stage vs raw step** — UI stage (`routing`, etc.) is derived from `execute.form` + `context.execution`, not a single stable server field; debugging “what state am I in?” requires knowing the projection rules ([`session-stage-machine.js`](../session-stage-machine.js)).

## 2. Session protocol instability (operator view)

Normative flow is **create → `POST …/next` → poll `GET …/async` → re-hydrate `GET …/sessions/{id}`** ([`WEB_UI_PROTOCOL.md`](WEB_UI_PROTOCOL.md), [`OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md)).

**Why it feels unstable:**

- **Ack vs truth** — `/next` returns a minimal ack; full state is on GET session. Scripts that only read the ack miss `execute` / errors / next required input shape.
- **Async surface** — `asyncPending`, `promiseStatus`, and `/async`’s `status` are related but not identical names; polling discipline must be consistent (no wall-clock “give up” on poll loops per project policy).
- **Deployment split** — Vite storage-mode responses vs SDK `{ success, session }` and `unwrap` ([`ADR-0028`](../docs/adr/ADR-0028-client-api-deployment-modes.md)) add another axis when the same mental model is reused across curl, UI, and SDK.
- **Normalization** — Router submits accept multiple spellings (`normalizeRouterStepSubmit`); behavior is helpful for humans but **non-obvious** for strict scripts unless documented test vectors exist.
- **`GET …/async` errors** — For `status` `failed` / `error`, the Client API returns a **minimal** `result` (status + optional `retryAfter` when recoverable) and omits projected `execute`, so polling does not re-stream large error bodies; `server-promise.json` is compacted the same way. Full details remain on the A2A server / logs for investigation.

## 3. Open alignment (answer in follow-up)

Questions for the product/owner are listed in the chat after this document is added; answers should drive whether we invest in **clearer UI affordances**, **stricter machine-readable session state**, **fewer overloads**, or **better operator tooling** only.

## References

| Doc | Role |
|-----|------|
| [`WEB_UI_PROTOCOL.md`](WEB_UI_PROTOCOL.md) | Web DTO, `/next`, `/async`, router |
| [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md) | Curl driver checklist |
| [`docs/AGENTS.md`](../docs/AGENTS.md) | Two-beat router, `buildSubmitResult` behavior |
| [`docs/adr/ADR-0028-client-api-deployment-modes.md`](../docs/adr/ADR-0028-client-api-deployment-modes.md) | Vite vs SDK response shapes

