# Web UI Client API base URL — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`index.html`** boot script uses **localStorage** key **`a2a_clientApiUrl`** (via constant **CLIENT_API_KEY**), with corruption guard resetting to **`/api`**. Settings modal (**settingsApiUrl**) documents **`/api`** or full URL like **`http://localhost:3001/api`**.

## Context

**Same-origin** (**/api**) fits Vite proxy + plugin; **absolute URL** targets standalone SDK or remote Client API. Pick default for your team and document CORS implications.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `same-origin-api` | `/api` | Browser calls current host; Vite proxy/plugin route. | Typical 5173 dev. |
| `sdk-absolute` | `http://localhost:3001/api` | Direct to SDK server. | Cross-origin; server CORS must allow web origin. |
| `remote-client-api` | HTTPS URL | Hosted Client API. | TLS, auth headers, CSP connect-src. |

## Current selection (this repo)

- [ ] `same-origin-api`
- [ ] `sdk-absolute`
- [ ] `remote-client-api`

**Stored value (example):**

**Notes:**

## Implementation backlog

- [ ] Align **AGENTS.md** curl examples with chosen default.

## Related

- `a2a-client/web/index.html`
- `docs/alternatives/vite-dev-api-routing/VARIANTS.md`
- `docs/adr/ADR-0028-client-api-deployment-modes.md`

## Open questions

- …
