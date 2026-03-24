# Session State Problems

Common issues with session state management and synchronization.

## State Corruption Detection

### Symptoms of Corruption
- UI shows stale data
- Actions don't update display
- Inconsistent panel states
- Session appears "stuck"

### Detection Methods
```javascript
function checkStateConsistency() {
  const state = SessionStore.getState();
  const issues = [];

  // Check for inconsistent waiting state
  if (state.status === 'waiting' && !state.pendingForm) {
    issues.push('Waiting status without pending form');
  }

  // Check for missing required fields
  if (state.sessionId && !state.projectId) {
    issues.push('Session without project ID');
  }

  // Check message order
  const messages = state.messages;
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].timestamp < messages[i-1].timestamp) {
      issues.push('Messages out of chronological order');
    }
  }

  // Check execute consistency
  if (state.execute?.form?.choices && state.status !== 'waiting') {
    issues.push('Form execute without waiting status');
  }

  return issues;
}

// Run diagnostic
const issues = checkStateConsistency();
if (issues.length > 0) {
  console.error('State inconsistencies found:', issues);
}
```

## Synchronization Issues

### Component Desync Symptoms
- Panel shows different state than SessionStore
- Transport events not reflected in UI
- Actions submitted but not acknowledged

### Recovery Procedures
```javascript
function resyncComponents() {
  // 1. Get authoritative state
  const sessionState = SessionStore.getState();

  // 2. Resync panels
  PanelManager.closeAll();
  if (sessionState.execute?.form) {
    PanelManager.open('task'); // Will show form
  }

  // 3. Resync transport
  if (TransportManager.isConnected()) {
    TransportManager.disconnect();
  }
  TransportManager.connect(sessionState.sessionId);

  // 4. Re-emit current state
  SessionStore._emit('reset', sessionState);
}
```

### Event Handler Conflicts
```javascript
// Check for duplicate event handlers
function auditEventHandlers() {
  const store = SessionStore;
  const listeners = store._listeners;

  Object.keys(listeners).forEach(event => {
    const handlers = listeners[event];
    console.log(`${event}: ${handlers.size} handlers`);

    // Check for memory leaks
    if (handlers.size > 10) {
      console.warn(`Too many handlers for ${event}, possible leak`);
    }
  });
}
```

## Context Loss and Restoration

### Context Loss Symptoms
- Execution state resets unexpectedly
- Task progress lost
- Session context becomes empty

### Context Preservation (Server-Side)
```javascript
// Context is preserved server-side automatically
// For critical operations, force server sync
async function syncContextToServer() {
  const context = SessionStore.getState().context;
  await api.saveContext(context);
  return context;
}

// Restore context from server after failure
async function restoreContextFromServer() {
  try {
    const context = await api.loadContext();
    if (context) {
      SessionStore.setContext(context);
      console.log('Context restored from server');
    }
  } catch (e) {
    console.error('Failed to restore context:', e);
  }
}
```

## Session Cleanup Problems

### Incomplete Cleanup Symptoms
- Old session data persists
- Memory usage grows over time
- UI shows data from previous sessions

### Cleanup Verification
```javascript
function verifyCleanup() {
  const state = SessionStore.getState();

  // Check for residual data
  const issues = [];
  if (state.messages.length > 0) {
    issues.push(`${state.messages.length} messages remaining`);
  }
  if (state.execute) {
    issues.push('Execute object not cleared');
  }
  if (state.pendingForm) {
    issues.push('Pending form not cleared');
  }
  if (PanelManager.getVisible().length > 0) {
    issues.push(`${PanelManager.getVisible().length} panels still visible`);
  }

  return issues;
}

// Clean session transition
function cleanSessionTransition(newSessionId, newProjectId) {
  // Backup current state if needed
  const previousState = SessionStore.getState();

  // Full cleanup
  PanelManager.closeAll();
  SessionStore.reset(newSessionId, newProjectId);
  TransportManager.disconnect();

  // Verify cleanup
  const issues = verifyCleanup();
  if (issues.length > 0) {
    console.warn('Cleanup incomplete:', issues);
    // Force cleanup
    location.reload();
  }
}
```

## Memory Leak Detection

### Leak Symptoms
- Browser memory usage grows continuously
- Performance degrades over time
- UI becomes unresponsive

### Leak Detection Tools
```javascript
function monitorMemoryUsage() {
  if (!performance.memory) {
    console.warn('Memory monitoring not available');
    return;
  }

  let lastUsage = performance.memory.usedJSHeapSize;

  setInterval(() => {
    const currentUsage = performance.memory.usedJSHeapSize;
    const delta = currentUsage - lastUsage;

    if (delta > 1024 * 1024) { // 1MB increase
      console.warn(`Memory leak detected: +${(delta / 1024 / 1024).toFixed(2)}MB`);
    }

    lastUsage = currentUsage;
  }, 30000); // Check every 30 seconds
}
```

### Component-Specific Leaks
```javascript
// Check for SessionStore leaks
function checkSessionStoreLeaks() {
  const store = SessionStore;
  const listenerCount = Array.from(store._listeners.values())
    .reduce((sum, set) => sum + set.size, 0);

  console.log(`SessionStore listeners: ${listenerCount}`);

  // Check message history size
  const messageCount = store.messages.length;
  console.log(`SessionStore messages: ${messageCount}`);

  if (messageCount > store.constructor.MAX_MESSAGES) {
    console.warn('Message history exceeds limit');
  }
}

// Check for PanelManager leaks
function checkPanelManagerLeaks() {
  const panelCount = PanelManager._panels.size;
  console.log(`PanelManager panels: ${panelCount}`);

  // Check for detached DOM elements
  PanelManager._panels.forEach((panel, id) => {
    if (!panel.container.isConnected) {
      console.warn(`Panel ${id} has detached DOM element`);
    }
  });
}
```

## State Persistence Issues

### Server Storage Issues
```javascript
async function diagnoseServerStorage() {
  try {
    // Test server storage availability
    const testResponse = await fetch('/api/storage/health');
    if (!testResponse.ok) {
      console.error('Server storage unavailable');
      return false;
    }

    // Test read/write
    await StorageAPI.default.setItem('test', 'value');
    const value = await StorageAPI.default.getItem('test');
    await StorageAPI.default.removeItem('test');

    if (value === 'value') {
      console.log('Server storage working correctly');
      return true;
    }
  } catch (e) {
    console.error('Server storage error:', e.message);
    return false;
  }
}
```

### Session Recovery
```javascript
function attemptSessionRecovery(sessionId, projectId) {
  // Try to restore from server
  fetch(`/api/sessions/${sessionId}`)
    .then(response => response.json())
    .then(data => {
      // Apply server state
      SessionStore.applyServerResponse(data);

      // Reconnect transport
      TransportManager.connect(sessionId);

      console.log('Session recovered from server');
    })
    .catch(error => {
      console.error('Session recovery failed:', error);

      // Last resort: fresh session
      SessionStore.reset(sessionId, projectId);
    });
}
```

## Cross-Tab Synchronization

### Multiple Tab Issues
- State changes in one tab not reflected in others
- Race conditions between tabs
- Duplicate session connections

### Synchronization Solutions
```javascript
// Broadcast channel for cross-tab communication
const channel = new BroadcastChannel('session-sync');

function setupCrossTabSync() {
  // Listen for state changes from other tabs
  channel.onmessage = (event) => {
    if (event.data.type === 'session-update') {
      // Apply update from another tab
      SessionStore.applyServerResponse(event.data.state);
    }
  };

  // Broadcast our state changes
  SessionStore.on('serverResponse', (state) => {
    channel.postMessage({
      type: 'session-update',
      state: state
    });
  });
}

// StorageEvent for additional sync
window.addEventListener('storage', (event) => {
  if (event.key === 'session-state') {
    try {
      const state = JSON.parse(event.newValue);
      SessionStore.applyServerResponse(state);
    } catch (e) {
      console.error('Failed to sync from storage:', e);
    }
  }
});
```

## Debugging Tools

### State Inspector
```javascript
function createStateInspector() {
  const inspector = {
    dump() {
      console.group('State Inspector');
      console.log('SessionStore:', SessionStore.toJSON());
      console.log('Transport:', TransportManager.getState());
      console.log('Panels:', PanelManager.getVisible().map(p => p.id));
      console.log('Memory:', performance.memory ?
        `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB` : 'N/A');
      console.groupEnd();
    },

    watch() {
      // Watch for state changes
      SessionStore.on('serverResponse', () => this.dump());
      TransportManager.on('connected', () => this.dump());
    },

    validate() {
      const issues = checkStateConsistency();
      if (issues.length > 0) {
        console.error('Validation failed:', issues);
        return false;
      }
      console.log('State validation passed');
      return true;
    }
  };

  // Add to global scope for console access
  window.stateInspector = inspector;
  return inspector;
}

// Usage: stateInspector.dump()
createStateInspector();
```

### Automated Monitoring
```javascript
function setupStateMonitoring() {
  let lastState = null;

  setInterval(() => {
    const currentState = SessionStore.toJSON();
    const currentJson = JSON.stringify(currentState);

    if (lastState && lastState !== currentJson) {
      console.log('State changed:', currentState);
    }

    lastState = currentJson;
  }, 5000); // Check every 5 seconds
}
```

## Emergency Recovery Procedures

### Complete State Reset
```javascript
async function emergencyReset() {
  // Clear server-side storage
  await StorageAPI.sessions.clear();
  await StorageAPI.default.clear();

  // Reset all components
  TransportManager.disconnect();
  PanelManager.closeAll();
  SessionStore.reset();

  // Clear any lingering event handlers
  window.location.reload();
}
```

### Partial Recovery
```javascript
function partialRecovery() {
  // Try to preserve session if possible
  const sessionId = SessionStore.sessionId;
  const projectId = SessionStore.projectId;

  // Clean up UI
  PanelManager.closeAll();

  // Reinitialize components
  TransportManager.disconnect();
  SessionStore.reset(sessionId, projectId);

  // Attempt reconnection
  setTimeout(() => {
    TransportManager.connect(sessionId);
  }, 1000);
}
```

### Diagnostic Report
```javascript
function generateDiagnosticReport() {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    sessionState: SessionStore.toJSON(),
    transportState: TransportManager.getState(),
    panelCount: PanelManager._panels.size,
    visiblePanels: PanelManager.getVisible().length,
    memoryUsage: performance.memory,
    localStorageKeys: Object.keys(localStorage).length,
    stateIssues: checkStateConsistency(),
    networkStatus: navigator.onLine
  };
}

// Generate and log report
console.log('Diagnostic Report:', generateDiagnosticReport());
```