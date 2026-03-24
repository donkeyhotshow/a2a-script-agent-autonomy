# Session Architecture Migration Guide

## Overview

This document describes the unified session architecture that consolidates state management, transport, and UI components.

## Related Workflows

For practical implementation of this architecture in user workflows:
- **[Session Lifecycle Scenarios](../workflows/session-lifecycle/)** - Session creation, switching, and management flows
- **[Communication Scenarios](../workflows/communication/)** - Transport layer implementation and fallback mechanisms
- **[UI Interaction Scenarios](../workflows/ui-interactions/)** - Unified panel system and UI components
- **[Testing Scenarios](../workflows/testing/)** - Validation of unified architecture components

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
// API integration with async polling
await api.sendMessage(sessionId, message);
// → Uses HTTP POST to /api/a2a/sessions/:id/next
// → Polls /async endpoint for promise resolution
```

**Files**:
- Modified: `js/api-integration.js` (unified HTTP client)
- Modified: `js/session-store.js` (async state management)

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
- Modified: `js/session-data.js` (data handling)

### Step 3: Window/UI System ✅

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
// Window registry handles UI state
WindowRegistry.open('task', { critical: true });
// States: created → visible ↔ minimized → closed
// Simplified indicator replaces "cube"
// Windows + modals unified via WindowState
```

**Files**:
- New: `js/app/windows/window-registry.js`
- New: `js/app/windows/window-state.js`
- New: `js/app/windows/window-position.js`

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
<script src="js/session-data.js"></script>

<!-- 2. API integration (transport layer) -->
<script src="js/api-integration.js"></script>

<!-- 3. Window/UI management -->
<script src="js/app/windows/window-registry.js"></script>
<script src="js/app/windows/window-state.js"></script>
<script src="js/app/windows/window-position.js"></script>

<!-- 4. Legacy files (can coexist) -->
<script src="js/session-manager.js"></script>
<script src="js/session-view-model.js"></script>

<!-- 5. Task flow -->
<script src="js/task-flow/index.js"></script>
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

### API Integration (transport)

```typescript
// Sending messages
await api.sendMessage(sessionId, message): Promise<Response>
await api.sendChoice(sessionId, choiceId): Promise<Response>
await api.sendFormResult(sessionId, formData): Promise<Response>

// Session management
await api.createSession(projectId): Promise<Session>
await api.getSession(sessionId): Promise<SessionState>
await api.listSessions(): Promise<Session[]>

// Async polling
await api.pollAsync(sessionId): Promise<AsyncResult>
```

### Window Registry (UI)

```typescript
// Core API
WindowRegistry.open(type, options): Window
WindowRegistry.create(type, options): Window
WindowRegistry.close(id)
WindowRegistry.remove(id)

// Query
WindowRegistry.get(id): Window | null
WindowRegistry.getByType(type): Window[]
WindowRegistry.getVisible(): Window[]

// Window instance
window.show()
window.minimize()
window.restore()
window.close()
window.setContent(html)
window.setStatus('active' | 'unread' | 'error')

// Window events
window.on('show', () => {})
window.on('minimize', () => {})
window.on('close', () => {})
```

## Benefits

1. **Single source of truth**: No more state synchronization bugs
2. **Simplified events**: Direct store→UI subscriptions
3. **Direct HTTP transport**: Simple fetch-based communication
4. **Window registry**: Unified window management system
5. **Backward compatible**: Legacy code continues working

- Three-level window hierarchy (PlasticineUI complexity)
- Multiple event emitter chains
- Duplicate state in SessionManager/ViewModel

## Next Steps

1. Test migration with existing features
2. Gradually replace legacy SessionManager calls
3. Remove adapter layer once fully migrated
4. Clean up legacy files (session-view-model.js, old session-sync.js)
