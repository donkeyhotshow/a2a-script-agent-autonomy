# Web daemons (browser)

**Scope:** UI-side background work only — poll the **Client API** (e.g. `GET /api/a2a/sessions/:id/promise/:promiseId`), not A2A Server directly. ES module [`../core/DialogPromise.js`](../core/DialogPromise.js) mirrors the same polling semantics for the refactored store.

Scripts attach factories to `window.__a2aDaemons`:

| Script | Exports |
|--------|---------|
| `emitter.js` | `createEventEmitter()`, `MIN_LOADER_MS`, `PROMISE_POLL_INTERVAL` (defaults, ms) |
| `dialog-loader.js` | `createDialogLoader()` — minimum loader display time |
| `dialog-promise-poll.js` | `createDialogPromise()` — interval poll via injected `checkFn` |

Load order: **emitter → dialog-loader → dialog-promise-poll → session-store.js**.

Index of all app daemons: [`../../../daemon/README.md`](../../../daemon/README.md).
