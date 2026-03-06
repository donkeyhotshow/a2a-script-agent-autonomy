# Session Architecture Migration Guide

## Overview

This document describes the unified session architecture that consolidates state management, transport, and UI components.

## Changes Summary

### Step 1: Transport Layer ✅

**Before (fragmented)**:
```javascript
// Multiple transport clients
SSEClient.connect(sessionId);
WebSocketClient.connect(sessionId);  // Separate fallback
pollResult(promiseId);               // HTTP polling for async
```

**After (unified)**:
```javascript
// Single transport manager with auto-fallback
await TransportManager.connect(sessionId);
// → Tries SSE first (10s timeout)
// → Falls back to WebSocket automatically
// → No HTTP polling
```

**Files**:
- New: `js/transport-manager.js`
- Modified: `js/task-flow.js` (removed polling)

### Step 2: State Management ✅

**Before (3 sources of truth)**:
```javascript
SessionManager._currentContext     // Context + execution
SessionViewModel.messages            // Conversation
SessionViewModel.execute             // Execute state
```

**After (1 source of truth)**:
```javascript
SessionStore._state = {
    sessionId, projectId,
    messages[],     // All conversation
    execute,        // Current execute
    context,        // Full server context
    status,         // idle | active | waiting | completed
    pendingForm     // Form awaiting input
}
```

**Files**:
- New: `js/session-store.js`
- New: `js/session-sync-v2.js` (SSE→Store bridge)
- New: `js/session-store-adapters.js` (backward compatibility)

### Step 3: Panel System ✅

**Before (complex hierarchy)**:
```
PlasticinePanel (main UI)
  → Cube (minimized representation)
  → Modal (separate system)
  → Drawer (docked state)
  → Status Tray (another state)
  
Lifecycle: expanded → minimized → docked → status-tray → closed-via-cube
```

**After (simplified)**:
```javascript
PanelManager.open('task', { critical: true });
// States: created → visible ↔ minimized → closed
// Simplified indicator replaces "cube"
// Panels + modals unified
```

**Files**:
- New: `js/panel-manager.js`
- New: `css/components/panel-manager.css`

## Migration Path

### For New Code

```javascript
// Initialize
SessionStore.init();
TransportManager.init();
PanelManager.init().syncWithSessionStore();

// Connect to session
await TransportManager.connect(sessionId);

// Subscribe to state changes
SessionStore.on('execute', (execute) => {
    renderExecute(execute);
});

SessionStore.on('messages', (messages) => {
    updateChat(messages);
});

// Open panel
const panel = PanelManager.open('task', { critical: true });
panel.setContent(renderContent());
```

### For Existing Code (Backward Compatible)

```javascript
// Old API still works via adapters
SessionManager.setActiveSession(sessionId);  // → delegates to TransportManager
SessionViewModel.pushMessage(msg, 'user');    // → delegates to SessionStore

// Include adapter script after store:
// <script src="js/session-store.js"></script>
// <script src="js/session-store-adapters.js"></script>
// <script src="js/session-manager.js"></script>  // Legacy still works
```

## File Loading Order

```html
<!-- 1. Core state -->
<script src="js/session-store.js"></script>

<!-- 2. Transport -->
<script src="js/transport-manager.js"></script>
<script src="js/session-sync-v2.js"></script>

<!-- 3. Adapters (for backward compatibility) -->
<script src="js/session-store-adapters.js"></script>

<!-- 4. Legacy files (can coexist) -->
<script src="js/session-manager.js"></script>
<script src="js/session-view-model.js"></script>
<script src="js/sse-client.js"></script>

<!-- 5. New panel system -->
<script src="js/panel-manager.js"></script>

<!-- 6. Application -->
<script src="js/task-flow.js"></script>
<script src="js/app.js"></script>
```

## API Reference

### SessionStore

```typescript
// State access
store.sessionId: string | null
store.projectId: string | null
store.messages: Message[]
store.execute: Execute | null
store.context: Context | null

// Computed
store.isWaitingForInput(): boolean
store.isActive(): boolean
store.isCompleted(): boolean
store.getProgress(): number | null
store.getCurrentStep(): string | null

// Actions
store.reset(sessionId?, projectId?)
store.setSession(id, projectId?)
store.setExecute(execute)
store.setContext(context)
store.pushMessage(msg, role)
store.applyServerResponse(data)

// Result builders
store.buildChoiceResult(choiceId)
store.buildMessageResult(message)
store.buildActionResult(type, data)

// Events
store.on('execute' | 'messages' | 'message' | 'context' | 
         'status' | 'reset' | 'error', handler)
```

### TransportManager

```typescript
// Connection
await connect(sessionId): boolean
disconnect()
isConnected(): boolean
getState(): { connectionState, activeTransport, sessionId }

// Events
transport.on('connected', ({ transport }) => {})
transport.on('message', ({ type, data }) => {})
transport.on('execute', (data) => {})
transport.on('error', (error) => {})
transport.on('reconnecting', ({ attempt }) => {})
```

### PanelManager

```typescript
// Core API
PanelManager.open(type, options): Panel
PanelManager.create(type, options): Panel
PanelManager.close(id)
PanelManager.remove(id)

// Query
PanelManager.get(id): Panel | null
PanelManager.getByType(type): Panel[]
PanelManager.getVisible(): Panel[]

// Panel instance
panel.show()
panel.minimize()
panel.restore()
panel.close()
panel.setContent(html)
panel.setStatus('active' | 'unread' | 'error')
```

## Benefits

1. **Single source of truth**: No more state synchronization bugs
2. **Simplified events**: Direct store→UI subscriptions
3. **Auto-fallback transport**: SSE → WebSocket without manual handling
4. **Unified panels**: One system instead of panels+cubes+modals
5. **Backward compatible**: Legacy code continues working

## Removed Code

- HTTP polling (`pollResult()` in `task-flow.js`)
- Three-level panel hierarchy (PlasticineUI complexity)
- Multiple event emitter chains
- Duplicate state in SessionManager/ViewModel

## Next Steps

1. Test migration with existing features
2. Gradually replace legacy SessionManager calls
3. Remove adapter layer once fully migrated
4. Clean up legacy files (session-view-model.js, old session-sync.js)
