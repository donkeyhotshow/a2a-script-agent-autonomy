# Client API deployment — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Same **wire contract** to A2A Server: `POST /api/v1/invoke`, same session/async semantics as documented in `AGENTS.md` / `docs/new-request-flow/PROTOCOL.md`.

## Context

The Web UI and tooling need a **Client API** (sessions, storage, proxy to server). The repo supports two deployment shapes; you choose **primary** for day-to-day work and **secondary** for scripts/SDK. Subsections below cover **Vite routing** and the **browser base URL** (same ADR surface as deployment mode).

## Variants (deployment shape)

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

## Current selection (deployment)

- [ ] `vite-same-origin`
- [ ] `standalone-sdk`
- [ ] `both-hybrid`

**Where it applies:**

**Notes:**

---

## Vite dev API routing

### Constraints (invariants)

- **vite-plugin-a2a** registers middleware for Client API routes under **api/a2a** (see plugin file header in `a2a-client/vite-plugin-a2a.js`).
- **vite.config.js** proxies path **/api** to **CLIENT_API_URL** or **localhost:CLIENT_API_PORT** with WebSocket enabled.

### Context

Choose whether dev relies on the **plugin only**, or also runs the **standalone SDK** on 3001 so the proxy can forward generic **/api** traffic. Middleware order affects which handler wins.

### Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `plugin-only` | No SDK process | Plugin serves Client API on Vite port. | Lightest; ADR-0028 primary web story. |
| `plugin-plus-sdk` | SDK alongside | Proxy may forward; plugin still handles a2a if first. | When tooling expects port 3001. |
| `sdk-primary` | Unusual | Standardize on SDK for all API; avoid unless verified. | Confirm order vs plugin. |

### Current selection (routing)

- [ ] `plugin-only`
- [ ] `plugin-plus-sdk`
- [ ] `sdk-primary`

**Env:** PORT, CLIENT_API_PORT, CLIENT_API_URL

**Notes:**

---

## Web UI Client API base URL

### Constraints (invariants)

- **`index.html`** boot script uses **localStorage** key **`a2a_clientApiUrl`** (via constant **CLIENT_API_KEY**), with corruption guard resetting to **`/api`**. Settings modal (**settingsApiUrl**) documents **`/api`** or full URL like **`http://localhost:3001/api`**.

### Context

**Same-origin** (**/api**) fits Vite proxy + plugin; **absolute URL** targets standalone SDK or remote Client API. Pick default for your team and document CORS implications.

### Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `same-origin-api` | `/api` | Browser calls current host; Vite proxy/plugin route. | Typical 5173 dev. |
| `sdk-absolute` | `http://localhost:3001/api` | Direct to SDK server. | Cross-origin; server CORS must allow web origin. |
| `remote-client-api` | HTTPS URL | Hosted Client API. | TLS, auth headers, CSP connect-src. |

### Current selection (base URL)

- [ ] `same-origin-api`
- [ ] `sdk-absolute`
- [ ] `remote-client-api`

**Stored value (example):**

**Notes:**

---

## Implementation backlog

- [ ] Align all runbooks with chosen primary port + path prefix.
- [ ] Link from `a2a-client/docs/CLIENT_API_WEB_SDK.md`.
- [ ] Align **AGENTS.md** curl examples with chosen default.

## Related

- ADR: [`docs/adr/ADR-0028-client-api-deployment-modes.md`](../../adr/ADR-0028-client-api-deployment-modes.md)
- Code: `a2a-client/vite-plugin-a2a/`, `a2a-client/packages/sdk/`, `a2a-client/vite.config.js`, `a2a-client/web/index.html`

## Open questions

- …
