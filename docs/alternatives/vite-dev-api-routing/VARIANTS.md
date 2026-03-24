# Vite dev API routing — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **vite-plugin-a2a** registers middleware for Client API routes under **api/a2a** (see plugin file header in `a2a-client/vite-plugin-a2a.js`).
- **vite.config.js** proxies path **/api** to **CLIENT_API_URL** or **localhost:CLIENT_API_PORT** with WebSocket enabled.

## Context

Choose whether dev relies on the **plugin only**, or also runs the **standalone SDK** on 3001 so the proxy can forward generic **/api** traffic. Middleware order affects which handler wins.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `plugin-only` | No SDK process | Plugin serves Client API on Vite port. | Lightest; ADR-0028 primary web story. |
| `plugin-plus-sdk` | SDK alongside | Proxy may forward; plugin still handles a2a if first. | When tooling expects port 3001. |
| `sdk-primary` | Unusual | Standardize on SDK for all API; avoid unless verified. | Confirm order vs plugin. |

## Current selection (this repo)

- [ ] `plugin-only`
- [ ] `plugin-plus-sdk`
- [ ] `sdk-primary`

**Env:** PORT, CLIENT_API_PORT, CLIENT_API_URL

**Notes:**

## Implementation backlog

- [ ] Link from `a2a-client/docs/CLIENT_API_WEB_SDK.md`.

## Related

- `a2a-client/vite.config.js`, `a2a-client/vite-plugin-a2a.js`
- `docs/adr/ADR-0028-client-api-deployment-modes.md`

## Open questions

- …
