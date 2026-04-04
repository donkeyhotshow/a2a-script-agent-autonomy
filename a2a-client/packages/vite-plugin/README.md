# @a2a-client/vite-plugin

Vite plugin that serves the **Client API** at `/api/a2a/*` during `vite` dev (sessions, steps, KV, models, daemons, actions). Package root: `packages/vite-plugin` (`index.js`).

## Environment

| Variable | Default | Role |
|----------|---------|------|
| `WEB_PORT` | `5173` | Vite dev server port (`vite.config.js`). |
| `CLIENT_API_PORT` | `3001` | Used to build `CLIENT_API_URL` when unset. |
| `CLIENT_API_URL` | `http://localhost:${CLIENT_API_PORT}` | Target for **non**-A2A `/api/*` proxy (everything except `/api/a2a/`). |

## Proxy split

- **`/api/a2a/*`** — handled by this plugin (middleware from `routes/*`), same process as Vite.
- **`/api/*` not under `/api/a2a/`** — proxied to `CLIENT_API_URL` (standalone SDK or other backend).

## Consumption

```js
import vitePluginA2a from '@a2a-client/vite-plugin';

export default {
  plugins: [vitePluginA2a()],
};
```

Resolve via npm workspaces from `a2a-client` root. See [ADR-0028](../../docs/adr/ADR-0028-client-api-deployment-modes.md).
