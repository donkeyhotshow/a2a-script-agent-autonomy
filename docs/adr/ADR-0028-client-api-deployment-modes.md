# ADR-0028: Client API deployment modes (Vite `/api/a2a` vs standalone SDK)

Status: accepted  
Date: 2026-03-24

## Context

The Web UI must talk to a **Client API** that owns sessions, storage paths, and proxying to the stateless A2A Server. Two deployment shapes exist in the repo:

1. **Vite dev stack (`a2a-client`, port 5173)** — `@a2a-client/vite-plugin` serves Client API routes under **`/api/a2a/*`** on the same origin as the web app (no separate HTTP server port for API in typical dev).
2. **Standalone SDK server (`a2a-client/packages/sdk`, often port 3001)** — an Express (or compatible) server for headless clients, tooling, or layouts where the UI is not served by Vite.

Documentation historically referred to “Client API on 3001” only, which mismatched the primary web developer path and produced wrong troubleshooting and curl examples.

## Decision

1. **Primary mode for Web UI development:** Client API is reached via **same-origin** paths **`/api/a2a/*`** on the Vite dev server (**5173**). This is the default documented in root [`AGENTS.md`](../../AGENTS.md) (Client API / Vite Plugin) and [`docs/new-request-flow/PROTOCOL.md`](../new-request-flow/PROTOCOL.md).

2. **Secondary mode:** A **standalone** Client API process may listen on **3001** (or another `PORT`) for SDK-driven or scripted clients. It must implement the same **contract** as the Vite plugin (sessions, proxy to `POST /api/v1/invoke`, async polling semantics) even if URL prefixes differ by deployment.

3. **Single wire contract to the server:** Both modes forward to **A2A Server** using **`POST /api/v1/invoke`** (and related request-management URLs as documented). The server does not distinguish Vite vs SDK.

4. **Documentation rule:** Normative endpoint lists for the web-facing Client API live in **[`AGENTS.md`](../../AGENTS.md)** and **[`docs/new-request-flow/PROTOCOL.md`](../new-request-flow/PROTOCOL.md)**. Other docs (architecture overviews, DATA-FLOW, FILES) only **summarize** and **link**; see [ADR-0027](ADR-0027-documentation-canonical-sources.md).

## Consequences

- **Examples and runbooks** must state whether they target **5173 + `/api/a2a`** or **standalone SDK + `:3001`**.
- **Health checks:** Vite-embedded API may not expose the same `/health` path as the SDK server; prefer session or project list routes as defined in AGENTS.
- **Tests** that assume `localhost:3001` remain valid for SDK mode but are not the only supported setup.
- **`POST …/next` ack:** Both surfaces return **`{ success, accepted, step, asyncPending }`** on success (Vite [`toMinimalNextAck`](../../a2a-client/packages/vite-plugin/routes/utils/session-projection-dto.js); SDK [`buildMinimalNextAck`](../../a2a-client/packages/sdk/src/server/lib/session-routes-shared.ts)). **`promiseId` is not echoed**; use **`asyncPending: true`** then **`GET …/async`**.
- **`POST …/next` request parity:** **Vite** ([`step-routes-dialog-flow.js`](../../a2a-client/packages/vite-plugin/routes/step-routes-dialog-flow.js)) and **SDK** ([`sessions-async.ts`](../../a2a-client/packages/sdk/src/server/server/routes/sessions-async.ts)) share **`buildSubmitResult` / router normalization / `mergeContext` / `determineInvokeMode` / `prepareServerRequest`** via [`router-submit.mjs`](../../a2a-client/shared/router-submit.mjs) and [`next-invoke-pipeline.mjs`](../../a2a-client/shared/next-invoke-pipeline.mjs). **SDK** loads the prior step from **`storage/sessions/{id}/{step}/server-response.json`** (fallback: in-memory session `context` + `execute`); **Vite** also supports **project-mode** step parents and step handlers — not identical storage layout. **`POST …/action`** on the SDK remains a separate, simplified path.
- **`GET …/sessions/:id` and messages (audit):** **Vite** [`sessionRoutes.js`](../../a2a-client/packages/vite-plugin/routes/sessionRoutes.js) returns the **session DTO as the top-level JSON body** (`toPublicSession(session, includeContext)`), not wrapped in `{ success, session }`. **`?includeContext=1` is rejected with 403** when `NODE_ENV=production`. Messages for the snapshot are rebuilt from step artifacts (`collectSessionMessagesFlat`) in default storage mode. **SDK** [`sessions-read.ts`](../../a2a-client/packages/sdk/src/server/server/routes/sessions-read.ts) defaults to **`{ success: true, session: … }`**; **`?unwrap=1`** returns the **same session object at the top level** (Vite-shaped body). **`?includeContext=1`** uses [`applyIncludeContextSessionProjection`](../../a2a-client/packages/sdk/src/server/lib/session-routes-shared.ts) (**403 in production**, same as Vite). **`GET …/messages`:** Vite delta via **`afterSeq` / `limit` / `withExecute`**; SDK uses **`{ success, data, count }`** when **`afterSeq` is omitted**, and the **same delta JSON shape as Vite** when **`afterSeq`** is present (in-memory messages; no project-storage 404). Scripts should still account for **path prefix** (`/api/a2a` vs SDK mount) and **Vite project-mode**-only behaviors.
## Related

- [ADR-0027](ADR-0027-documentation-canonical-sources.md) — canonical map (AGENTS, PROTOCOL, DATA-FLOW).
- [ADR-0001](ADR-0001-simulations-as-golden-standard.md) — simulations; client/server artifacts stay mode-agnostic at `request.json` / `response.json` level.
