# a2a-client — polling daemons

| Location | Responsibility |
|----------|------------------|
| [`vite-plugin-a2a/daemon/a2a-result-poll.js`](../../vite-plugin-a2a/daemon/a2a-result-poll.js) | **Client API (Node):** poll A2A Server `GET /api/v1/requests/:promiseId/result` until terminal state; used by `stepRoutes`, `server-proxy`, `a2a-proxy`. |
| [`web/js/daemons/`](../../web/js/daemons/README.md) | **Browser:** loader min-time + `createDialogPromise()` polling via injected `checkFn` (typically Client API promise endpoint). |
