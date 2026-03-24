# WindowRegistry API Reference

The WindowRegistry manages the registry of open session windows, providing state persistence and session tracking.

## Overview

```javascript
const window = WindowRegistry.getWindow(sessionId);
const hasWindow = WindowRegistry.hasWindow(sessionId);
const allSessions = WindowRegistry.getAllSessionIds();
```

## Initialization

WindowRegistry is automatically initialized as a global singleton. No manual initialization required.

## Methods

### `WindowRegistry.getSessionWindows()`

Returns the internal Map of session windows.

**Returns:** `Map<string, HTMLElement>` - Map of session ID to panel element

---

### `WindowRegistry.getWindow(sessionId)`

Get window panel by session ID.

**Parameters:**
- `sessionId` (string): Session identifier

**Returns:** `HTMLElement|null` - Panel element or null if not found

---

### `WindowRegistry.getSessionStore(sessionId)`

Get SessionStore instance associated with a window.

**Parameters:**
- `sessionId` (string): Session identifier

**Returns:** `SessionStore|null` - Associated SessionStore or null

---

### `WindowRegistry.hasWindow(sessionId)`

Check if window exists for session.

**Parameters:**
- `sessionId` (string): Session identifier

**Returns:** `boolean` - True if window exists

---

### `WindowRegistry.getAllSessionIds()`

Get all registered session IDs.

**Returns:** `string[]` - Array of session IDs

---

### `WindowRegistry.saveSessionWindowsState()`

Persist current session windows state to StorageAPI.

**Returns:** `Promise<void>`

---

### `WindowRegistry.loadSessionWindowsState()`

Load and restore session windows state from StorageAPI.

**Returns:** `Promise<string[]>` - Array of restored session IDs

---

## State Management

The WindowRegistry maintains state in localStorage under key `a2a_session_windows`:

```json
{
  "windows": ["sess_123_...", "sess_456_..."],
  "active": "sess_123_...",
  "timestamp": 1700000000000
}
```

## Related

- [PanelManager (deprecated)](panel-manager.md) - Old planned module
- [Window State](window-state.js) - Individual window state management
- [Window Position](window-position.js) - Window positioning utilities