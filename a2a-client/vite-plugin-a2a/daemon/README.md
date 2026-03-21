# Client API daemon (Vite plugin / Node)

**Scope:** poll **A2A Server** `GET /api/v1/requests/:promiseId/result` (used by **`GET /api/a2a/sessions/:id/promise/:promiseId`** and other callers). **`POST .../next`** no longer blocks on this poll — the browser daemon polls the Client API promise route instead.

| Export (see [`index.js`](./index.js)) | Role |
|---------------------------------------|------|
| `pollA2ARequestResult`, `PollingDaemon` | Blocking poll with retries/stats |
| `isA2AResultCompleted`, `isA2AResultFailed` | Terminal-state helpers |

Parent index: [`../../daemon/README.md`](../../daemon/README.md).
