# Web daemons (browser)

Scripts attach factories to `window.__a2aDaemons`:

| Script | Exports |
|--------|---------|
| `emitter.js` | `createEventEmitter()` |
| `dialog-loader.js` | `createDialogLoader()` — minimum loader display time |
| `dialog-promise-poll.js` | `createDialogPromise()` — interval poll via injected `checkFn` |

Load order: **emitter → dialog-loader → dialog-promise-poll → session-store.js**.
