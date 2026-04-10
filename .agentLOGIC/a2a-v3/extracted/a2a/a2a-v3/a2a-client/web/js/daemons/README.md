# Web daemons (browser)

**Scope:** UI-side background work only — poll the **Client API** (`GET /api/a2a/sessions/:id/async` in storage mode; no transport id in the web layer). Legacy: `GET .../promise/:promiseId`. Not A2A Server directly. This folder is what the page loads; [`../core/DialogPromise.js`](../core/DialogPromise.js) is the ESM twin used in unit tests / imports, not bundled into the classic script stack.

Scripts attach factories to `window.__a2aDaemons`:

| Script | Exports |
|--------|---------|
| `emitter.js` | `createEventEmitter()`, `DEFAULT_A2A_TIMING_MS`, `timingMs(key)`, `MIN_LOADER_MS`, `PROMISE_POLL_INTERVAL` |
| `dialog-loader.js` | `createDialogLoader()` — minimum loader display time |
| `dialog-promise-poll.js` | `createDialogPromise()` — interval poll via injected `checkFn` |
| `session-background-registry.js` | `SessionBackgroundRegistry` — tracks background processes per project/session |

Load order: **emitter → dialog-loader → dialog-promise-poll → session-background-registry.js → session-store.js**.

Index of all app daemons: [`../../../daemon/README.md`](../../../daemon/README.md).
