# Web Client Integration Guide

## Overview

This document describes how the A2A Web Client integrates with the Tester system to enable remote command execution and monitoring.

## Architecture Integration

```
Web Client
├── TransportManager (SSE/WebSocket)
├── CommandHandler (Command Processing)
├── PanelManager (UI Control)
├── SessionStore (State Management)
└── UI Components (DOM Manipulation)
```

## TransportManager Integration

### SSE Event Handling
The TransportManager has been extended to handle tester-specific SSE events:

```javascript
// Added to _bindSSEEvents()
'connected', 'message', 'log', 'progress', 'status',
'task_response', 'session_update', 'action_proposal',
'action_executing', 'step_result', 'complete', 'error',
'node_added', 'node_updated', 'edge_added',
'tester_command', 'tester_broadcast'  // ← New events
```

### Event Processing
```javascript
// TransportManager forwards tester events to CommandHandler
eventSource.addEventListener('tester_command', (event) => {
  const data = JSON.parse(event.data);
  CommandHandler._handleCommand(data);
});

eventSource.addEventListener('tester_broadcast', (event) => {
  const data = JSON.parse(event.data);
  CommandHandler._handleBroadcast(data);
});
```

## CommandHandler Integration

### Initialization
CommandHandler is initialized during page load:

```javascript
// In index.html
document.addEventListener('DOMContentLoaded', () => {
  SessionStore.init();
  TransportManager.init();
  PanelManager.init().syncWithSessionStore();
  CommandHandler.init();  // ← Added
});
```

### Command Registration
Built-in commands are registered automatically:

```javascript
_registerCommands() {
  // Panel commands
  this.registerCommand('panel_control', this._handlePanelCommand.bind(this));

  // Session commands
  this.registerCommand('session_control', this._handleSessionCommand.bind(this));

  // Utility commands
  this.registerCommand('ping', this._handlePing.bind(this));
  // ... more commands
}
```

### Response Handling
Responses are sent back via WebSocket:

```javascript
_sendResponse(commandId, response) {
  if (global.TransportManager && global.TransportManager.send) {
    global.TransportManager.send('tester_response', {
      commandId,
      response,
      timestamp: new Date().toISOString()
    });
  }
}
```

## PanelManager Integration

### Panel Control API
CommandHandler integrates with PanelManager for UI manipulation:

```javascript
async _handleShowPanel(data) {
  const { panelId } = data;
  const panel = global.PanelManager.getPanel(panelId);
  if (!panel) {
    global.PanelManager.createPanel(panelId);
  }
  global.PanelManager.showPanel(panelId);
  return { panelId, action: 'shown' };
}
```

### Available Panel Operations
- `createPanel(id)` - Create new panel
- `showPanel(id)` - Show panel
- `hidePanel(id)` - Hide panel
- `movePanel(id, x, y)` - Move panel position
- `resizePanel(id, width, height)` - Resize panel
- `minimizePanel(id)` - Minimize panel
- `maximizePanel(id)` - Maximize panel
- `closePanel(id)` - Close panel

## SessionStore Integration

### Session Management API
CommandHandler uses SessionStore for session operations:

```javascript
async _handleCreateSession(data) {
  const sessionId = `session_${Date.now()}_${Math.random()}`;
  const session = {
    id: sessionId,
    title: data.title || 'CLI Created Session',
    createdAt: new Date().toISOString()
  };

  global.SessionStore.createSession(session);
  return { sessionId, title: session.title };
}
```

### Session Operations
- `createSession(session)` - Create new session
- `getSession(id)` - Get session by ID
- `getCurrentSession()` - Get active session
- `switchToSession(id)` - Switch active session
- `deleteSession(id)` - Delete session
- `getAllSessions()` - List all sessions

## UI Component Integration

### DOM Manipulation
Commands can directly manipulate DOM elements:

```javascript
async _handleReloadPage(data) {
  const { delay = 1000 } = data;
  setTimeout(() => {
    window.location.reload();
  }, delay);
  return { action: 'reload_scheduled', delay };
}
```

### Safe Execution
All DOM operations include error handling:

```javascript
try {
  // DOM manipulation code
  return { success: true, result };
} catch (error) {
  return { success: false, error: error.message };
}
```

## Error Handling

### Command Execution Errors
```javascript
async _handleCommand(commandData) {
  try {
    const result = await handler(data, commandData);
    this._sendResponse(commandId, { success: true, result });
  } catch (error) {
    this._sendResponse(commandId, {
      success: false,
      error: error.message
    });
  }
}
```

### Validation Errors
```javascript
if (!data.panelId) {
  throw new Error('panelId required for panel commands');
}
```

## Security Considerations

### Input Sanitization
All command data is validated before execution:

```javascript
validateCommand(command, data) {
  // Validate required fields
  // Sanitize input data
  // Check permissions
}
```

### Safe DOM Access
DOM operations are wrapped in try-catch blocks:

```javascript
try {
  const element = document.getElementById(panelId);
  if (!element) throw new Error('Panel element not found');
  // Safe manipulation
} catch (error) {
  throw new Error(`DOM operation failed: ${error.message}`);
}
```

## Performance Optimization

### Command Queuing
Commands are processed asynchronously to avoid blocking:

```javascript
async _handleCommand(commandData) {
  // Queue command for processing
  setTimeout(async () => {
    await this._processCommand(commandData);
  }, 0);
}
```

### Resource Cleanup
Event listeners and timers are properly cleaned up:

```javascript
// In cleanup methods
if (this._commandTimer) {
  clearTimeout(this._commandTimer);
}
```

## Debugging Support

### Debug Information
Commands can access detailed debug information:

```javascript
async _handleDebugInfo() {
  return {
    timestamp: new Date().toISOString(),
    location: window.location.href,
    userAgent: navigator.userAgent,
    sessionStore: { ... },
    panelManager: { ... },
    transportManager: { ... },
    commandHistory: this._history.slice(-10)
  };
}
```

### Console Logging
All command execution is logged to console:

```javascript
console.log('[CommandHandler] Received command:', command, 'ID:', commandId);
```

## Testing Integration

### Test Command Support
Special commands for testing scenarios:

```javascript
// Test panel creation and manipulation
await sendCommand('create_test_panels', { count: 5 });

// Test session switching
await sendCommand('switch_sessions_rapidly', { iterations: 10 });
```

### Performance Monitoring
Built-in performance measurement:

```javascript
const startTime = performance.now();
// Execute command
const endTime = performance.now();
console.log(`Command executed in ${endTime - startTime}ms`);
```

## Extension Points

### Custom Commands
Add new commands by registering handlers:

```javascript
CommandHandler.registerCommand('custom_command', async (data) => {
  // Custom logic
  return { result: 'custom response' };
});
```

### UI Integration
Integrate with existing UI components:

```javascript
// Access existing UI managers
const uiManager = global.UIManager;
const notificationManager = global.NotificationManager;
```

### Event Integration
Listen for existing UI events:

```javascript
document.addEventListener('panelShown', (event) => {
  // Handle panel show events
});
```

## Troubleshooting

### Common Issues

#### Commands Not Executing
1. Check if CommandHandler is initialized
2. Verify TransportManager is connected
3. Check browser console for errors
4. Ensure command is registered

#### Panel Operations Failing
1. Verify PanelManager is loaded
2. Check panel ID exists
3. Ensure DOM is ready
4. Check for CSS conflicts

#### Session Operations Failing
1. Verify SessionStore is initialized
2. Check session ID format
3. Ensure session exists
4. Check storage permissions

#### Performance Issues
1. Monitor command execution time
2. Check for memory leaks
3. Verify event listener cleanup
4. Profile DOM operations

## Future Enhancements

### Planned Features
- **Command Recording**: Record and replay command sequences
- **Visual Feedback**: UI indicators for command execution
- **Batch Commands**: Execute multiple commands atomically
- **Command Scheduling**: Time-based command execution
- **Remote Debugging**: Enhanced debugging capabilities

### API Extensions
- **Plugin System**: Load custom command plugins
- **Command Macros**: Define reusable command sequences
- **State Synchronization**: Sync command state across sessions
- **Command History**: Persistent command history and undo/redo