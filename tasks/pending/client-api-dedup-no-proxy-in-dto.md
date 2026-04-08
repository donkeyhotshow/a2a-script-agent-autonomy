# Client API dedup + no proxy metadata in client surface

**Purpose:** Reduce duplicate maintenance (Vite vs SDK, Task Monitor modules, scripts) **without** widening what the **client** sees about **ai-integration / proxy**.

## Non-negotiable (privacy + separation)

Per [`AGENTS.md`](../../AGENTS.md) *Client-Server Data Separation* and *Invoke payload privacy*:

- **Client-visible DTOs** (`GET …/sessions`, `…/messages`, `execute`, sanitized `context`, web UI state) **must not** carry **proxy/hub implementation data**: internal hub URLs, queue-daemon semantics, `ai-integration` path prefixes, or other **C-layer** details in fields the browser or session JSON persists for operators.
- **`/api/a2a/hub/*`** (or equivalent) is **server-side / same-origin transport** for operators and tooling only. Consolidating **`hubPromiseRoutes.js`** (Vite) and **`hub-proxy.ts`** (SDK) is allowed **only** if the refactor:
  - keeps hub traffic as an **opaque passthrough** from the caller’s perspective, and
  - does **not** merge hub response bodies into **session** payloads, **workbench**, or **messages** unless those shapes are already contract-approved and stripped of proxy internals.

**Done when:** Shared hub-proxy helper (or single owner) exists; **no** new client-facing fields documenting the proxy; existing sanitization tests / envelope tests still pass; integration test proves hub routes behave the same.

**Other redundancy (Task Monitor code, human-review script, `DEV_STATE`, session-store naming, gitignore, doc path audit):** [`repo-redundancy-and-hygiene.md`](repo-redundancy-and-hygiene.md) — **not** part of the hub/DTO parity ticket.

## Evidence

- `npx vitest run a2a-client/tests/integration/hub-proxy-client-api.test.js` (or current hub route tests).
- `npx vitest run tests/infrastructure/monitor-and-process-tasks.test.js` if Task Monitor files move.
- Spot-check: `GET /api/a2a/sessions/{id}` with `includeContext=1` (dev) — no new hub/proxy metadata keys.
