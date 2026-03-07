# API Reference Documentation

This directory contains comprehensive API reference documentation for all core components of the A2A Web Client.

## Component References

### Core Components

| Component | Description | File |
|-----------|-------------|------|
| **SessionStore** | Unified session state management | [session-store.md](session-store.md) |
| **TransportManager** | Real-time communication handling | [transport-manager.md](transport-manager.md) |
| **PanelManager** | UI panel lifecycle management | [panel-manager.md](panel-manager.md) |
| **ActionHandler** | Standardized action submission | [action-handler.md](action-handler.md) |

### Supporting Components

| Component | Description | File |
|-----------|-------------|------|
| **TaskFlow** | Task execution orchestration | [task-flow.md](task-flow.md) |
| **WebAPIClient** | HTTP API communication | [web-api-client.md](web-api-client.md) |
| **ErrorHandler** | Error processing and display | [error-handler.md](error-handler.md) |

## API Conventions

All components follow consistent patterns:

- **Initialization**: `Component.init(options)` - returns component instance
- **Event System**: `component.on(event, callback)` - subscribe to events
- **State Access**: `component.getState()` - get current state
- **Method Chaining**: Most methods return `this` for chaining

## Action-Key Shape

All action results and execute requests use the **action-key shape**:

```javascript
// Result submission
{ result: { "script": { output: "..." } } }

// Execute request
{ execute: { "read-file": { path: "/file.txt" } } }
```

See [Protocol Documentation](../../new-request-flow/PROTOCOL.md#action-key-shape-обязательно) for details.

## Event System

Components emit events for state changes:

```javascript
const store = SessionStore.init();
store.on('messages', (messages) => {
  console.log('Messages updated:', messages);
});
```

## Error Handling

All async operations return Promises and throw descriptive errors:

```javascript
try {
  await actionHandler.submit(sessionId, projectId, result);
} catch (error) {
  console.error('Submission failed:', error.message);
}
```

## Cross-References

- **[Glossary](../glossary.md)** - Technical terminology
- **[Workflow Documentation](../../workflows/)** - Usage patterns
- **[Troubleshooting](../troubleshooting/)** - Common issues
- **[Simulations Documentation](../new-request-flow/SIMULATION-FORMAT.md)** - Practical implementations