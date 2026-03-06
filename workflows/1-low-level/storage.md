# Storage Workflow

> **Files:** `storage.js`, `session-store.js`
>
> **Note:** localStorage removed - all storage is now file-based via `/api/storage` API

## Overview

Storage layer manages persistence via file-based API (`/api/storage`). No browser storage (localStorage, IndexedDB) is used. All data persisted server-side.

## Architecture

```
session-store.js (core, in-memory only)
    ↓
storage.js (CustomStorage via API)
    ↓
/api/storage/{namespace}/{key} → File system
```

## Key Change: No LocalStorage

**Before:**
- localStorage for sync fallbacks
- Session persistence across page refreshes
- Client-side state restoration

**After:**
- No localStorage usage anywhere
- Server-side session persistence only
- Sessions restored via API on reconnect
- Ephemeral client-side state

## When to Edit

| Task | File | Section |
|------|------|---------|
| Add storage namespace | `storage.js` | Add to `storage` object |
| Change API endpoint | `storage.js` | `STORAGE_BASE_URL` |
| Add retry logic | `storage.js` | `fetchWithRetry()` |
| Session state | `session-store.js` | State accessors |

## Core Flow: Save Data

```javascript
// 1. Application calls StorageAPI
await StorageAPI.sessions.setItem('key', value);

// 2. CustomStorage makes API call
const response = await fetch(`/api/storage/sessions/key`, {
  method: 'PUT',
  body: JSON.stringify({ value, timestamp })
});

// 3. Server persists to file system
// (implementation in a2a-server)
```

## Core Flow: Session State (Ephemeral)

```javascript
// SessionStore holds state in memory only
SessionStore._state = {
  sessionId: null,
  projectId: null,
  messages: [],
  execute: null,
  context: null
};

// No persistence to localStorage
// State lost on page refresh - restored from server via API
```

## API Methods

```javascript
// Async only - no sync methods
await StorageAPI.default.getItem(key);      // GET /api/storage/default/{key}
await StorageAPI.default.setItem(key, val); // PUT /api/storage/default/{key}
await StorageAPI.default.removeItem(key);   // DELETE /api/storage/default/{key}
await StorageAPI.default.clear();           // DELETE /api/storage/default
await StorageAPI.default.keys();            // GET /api/storage/default/keys
```

## Namespaces

```javascript
const storage = {
  default: new CustomStorage('default'),     // General data
  sessions: new CustomStorage('sessions'),     // Session metadata
  ui: new CustomStorage('ui'),                 // UI state (ephemeral now)
  config: new CustomStorage('config'),         // Configuration
  panels: new CustomStorage('panels'),         // Panel state
  aiActions: new CustomStorage('ai-actions')    // AI action data
};
```

## Session Restoration

```javascript
// On page load - no localStorage lookup
async function initSession() {
  // Get sessionId from URL, server, or create new
  const sessionId = await getSessionIdFromServer();

  // Restore from server via API
  if (sessionId) {
    await SessionStore.restoreAndReconnect(sessionId);
  }
}
```

## Testing Changes

```bash
# Test storage API
cd a2a-client
npm run test:storage

# Test server storage endpoints
cd a2a-server
npm run test:storage:api
```

## Migration from localStorage

If you find code using localStorage:

```javascript
// Before (localStorage)
localStorage.setItem('key', value);
const value = localStorage.getItem('key');

// After (file-based API)
await StorageAPI.default.setItem('key', value);
const value = await StorageAPI.default.getItem('key');

// Or for ephemeral state (SessionStore)
SessionStore.setX(value);  // In-memory only
```

## No Persistence Patterns

```javascript
// For truly ephemeral state (lost on refresh):
// Just use SessionStore - no persistence

SessionStore.setExecute(executeData);  // Memory only
SessionStore.pushMessage(message);      // Memory only

// For data that must survive refresh:
// Use explicit API calls to server
await saveToServer(data);
```
