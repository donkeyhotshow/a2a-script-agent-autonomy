# Client API deployment — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Same **wire contract** to A2A Server: `POST /api/v1/invoke`, same session/async semantics as documented in `AGENTS.md` / `docs/new-request-flow/PROTOCOL.md`.

## Context

The Web UI and tooling need a **Client API** (sessions, storage, proxy to server). The repo supports two deployment shapes; you choose **primary** for day-to-day work and **secondary** for scripts/SDK.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `vite-same-origin` | Vite plugin on 5173 | `/api/a2a/*` on the dev server origin. | Default for `a2a-client` web dev. |
| `standalone-sdk` | `@a2a/sdk` HTTP server | Often `:3001` (or `PORT`); headless / tooling. | E2E, prod-like client, curl to fixed port. |
| `both-hybrid` | Both in parallel | Web on 5173, SDK on 3001 for automation. | Team splits UI vs integration tests. |

### `vite-same-origin`

- **Use when:** daily UI work, same-origin fetches, no separate API process.
- **Cost / risk:** Examples must use `http://localhost:5173/api/a2a/...`.
- **Status:** candidate

### `standalone-sdk`

- **Use when:** CI client tests, non-Vite hosts, explicit API port.
- **Cost / risk:** Another process; health paths may differ from Vite.
- **Status:** candidate

### `both-hybrid`

- **Use when:** you need both curl recipes and Vite HMR.
- **Cost / risk:** two processes, doc drift if not labeled.
- **Status:** candidate

## Current selection (this repo)

- [ ] `vite-same-origin`
- [ ] `standalone-sdk`
- [ ] `both-hybrid`

**Where it applies:**

**Notes:**

## Implementation backlog

- [ ] Align all runbooks with chosen primary port + path prefix.

## Related

- ADR: [`docs/adr/ADR-0028-client-api-deployment-modes.md`](../../adr/ADR-0028-client-api-deployment-modes.md)
- Code: `a2a-client/vite-plugin-a2a/`, `a2a-client/packages/sdk/`

## Open questions

- …
