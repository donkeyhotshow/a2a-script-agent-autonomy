# Session Store Architecture

Purpose: clarify when to use the global `SessionStore`, per-window stores (`WindowRegistry`), and `SessionStoreResolver`.

## Three-Tier Model

1. **Global store** (`web/js/session-store.js`)
   - Singleton: `window.SessionStore`.
   - Baseline store for app-level behavior and backward compatibility.
   - Safe default when code is not tied to a specific session window.

2. **Per-window store** (`web/js/app/windows/window-registry.js`)
   - Window panels may keep their own `panel._sessionStore`.
   - `WindowRegistry.getSessionStore(sessionId)` returns that session-specific instance.
   - Use when logic must target one concrete open session window.

3. **Resolver layer** (`web/js/session-store-resolver.js`)
   - `SessionStoreResolver.resolve(sessionId?)` tries registered providers first.
   - `window-registry` provider is registered in `window-registry.js`.
   - Falls back to `window.SessionStore` when no window-specific store is found.
   - Use for shared/service modules that should not import window internals.

## Initialization Order (Required)

Core dependency order:

1. `js/daemons/emitter.js`
2. `js/daemons/dialog-loader.js`
3. `js/session-data.js`
4. `js/session-store.js`
5. `js/session-store-resolver.js`

This order guarantees:
- daemon/event primitives exist before store core creation,
- `SessionData.createSessionStoreCore()` exists before `SessionStore` bootstrap,
- resolver can safely fallback to initialized global `SessionStore`.

## Decision Tree: Which Store Should I Use?

1. Do you have an explicit `sessionId` and need the store for that specific window?
   - **Yes** -> use `SessionStoreResolver.resolve(sessionId)`.
   - **No** -> go to 2.

2. Is your code a shared utility/service used by both windowed and non-windowed flows?
   - **Yes** -> use `SessionStoreResolver.resolve(optionalSessionId)`.
   - **No** -> go to 3.

3. Is this app-level code that intentionally operates on the default/global runtime state?
   - **Yes** -> use `window.SessionStore`.
   - **No / unsure** -> prefer resolver to avoid accidental global-only coupling.

## Practical Guidance

- Prefer **resolver** in new shared logic; it gives correct window binding when available and safe fallback otherwise.
- Use **global store** for compatibility paths and app bootstrap where session-window ownership is not yet known.
- Use **WindowRegistry direct access** only in window-management code; avoid leaking this dependency into generic modules.

## Related

- [SESSION-READ-MODEL.md](./SESSION-READ-MODEL.md)
- [WEB_UI_PROTOCOL.md](./WEB_UI_PROTOCOL.md)
- [session-management-protocols.md](./session-management-protocols.md)
