# Session Sync Workflow

> **Files:** `session-sync-v2.js`, `session-store.js`, `transport-manager.js`
>
> **Note:** localStorage removed - cross-tab sync now via Server-Sent Events (SSE)

## Overview

Session synchronization is now handled server-side via SSE. No localStorage usage. Each tab connects to the server and receives state updates via SSE events.

## Architecture

```
Tab 1 ←──────┐
             ↓
Tab 2 ←──── Server (SSE broadcast)
             ↑
Tab 3 ←─────┘
```

## Key Change: Server-Side Sync

**Before:**
- localStorage for cross-tab sync
- StorageEvent listeners
- Client-side conflict resolution

**After:**
- Server is source of truth
- SSE for real-time updates
- Server handles conflict resolution
- All tabs receive same state via events

## When to Edit

| Task | File | Area |
|------|------|------|
| Add sync event type | `transport-manager.js` | Event dispatch |
| Handle sync event | `session-store.js` | Event listeners |
| Debug sync issues | `transport-manager.js` | SSE logging |

## Core Flow: Cross-Tab Sync via SSE

```javascript
// Tab 1: User action updates state
await SessionStore.setExecute(executeData);

// 1. Send to server via API
await api.updateSession(sessionId, { execute: executeData });

// 2. Server broadcasts to all connected tabs via SSE
sseManager.broadcast(sessionId, 'session:updated', {
  execute: executeData,
  timestamp: Date.now()
});

// 3. Tab 2 receives SSE event
TransportManager.on('session:updated', (data) => {
  // 4. Update local state
  SessionStore.applyServerResponse(data);

  // 5. Notify components
  EventBus.emit('session:updated', data);
});
```

## Sync Events

```javascript
// Events broadcast via SSE
const SYNC_EVENTS = [
  'session:created',      // New session created
  'session:updated',      // Session state changed
  'session:completed',    // Task completed
  'execute:received',     // New execute data
  'context:updated',      // Context changed
  'messages:added'        // New messages
];
```

## Server as Source of Truth

```javascript
// State changes flow:
User Action → API Call → Server Update → SSE Broadcast → All Tabs

// No two-way sync needed - server always wins
// Tab state is read-only replica of server state
```

## Conflict Resolution

```javascript
// Conflicts resolved server-side
// Client receives resolved state via SSE

// Client only applies what server sends
SessionStore.applyServerResponse(data) {
  // Apply server state directly - no conflict resolution
  this._state.execute = data.execute;
  this._state.context = data.context;
  this._state.messages = data.messages;
}
```

## Testing

```bash
# Test SSE sync
npm run test:sync:sse

# Multi-tab simulation (server-based)
npm run test:sync:server
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Changes not syncing | SSE disconnected | Check TransportManager connection |
| Out of sync | Network lag | State refreshes on reconnect |
| Old state shown | Cache issue | Force refresh from server |

## Migration from localStorage Sync

**Before:**
```javascript
// Cross-tab via localStorage
localStorage.setItem('session', JSON.stringify(data));
window.addEventListener('storage', handler);
```

**After:**
```javascript
// Cross-tab via server SSE
await api.updateSession(data);
// All tabs receive SSE event automatically
```
