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

## Related

- [ADR-0027](ADR-0027-documentation-canonical-sources.md) — canonical map (AGENTS, PROTOCOL, DATA-FLOW).
- [ADR-0001](ADR-0001-simulations-as-golden-standard.md) — simulations; client/server artifacts stay mode-agnostic at `request.json` / `response.json` level.
