# Client API daemons

## `a2a-result-poll.js`

Polls the A2A Server `GET /api/v1/requests/:promiseId/result` until:

- **completed** — `status` is `completed` or `done`, or `execute` is present
- **failed** — `status` is `failed` or `error`
- **timeout** — `maxPolls` exhausted (default 30 × `intervalMs`)

Used by `routes/proxy/a2a-proxy.js`, `routes/stepRoutes.js`, and `routes/services/server-proxy.js`.
