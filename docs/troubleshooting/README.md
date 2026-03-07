# Troubleshooting Guide

This directory contains troubleshooting guides for common issues in the A2A Script Agent system.

## Quick Reference

| Issue Category | Common Symptoms | Quick Fix |
|----------------|-----------------|-----------|
| **SSE Connection** | No real-time updates, stuck loading | Check CORS, try WebSocket fallback |
| **Session State** | UI not updating, state corruption | Clear local storage, check synchronization |
| **Panel Rendering** | Panels not showing, layout broken | Check CSS, clear panel state |
| **Execute Processing** | Actions not working, malformed responses | Validate action-key shape, check server logs |

## Issue Categories

### 🔗 [SSE Connection Issues](sse-connections.md)
- CORS blocking and workarounds
- Network failures and reconnection
- Server-side SSE problems
- WebSocket fallback debugging

### 🔄 [Session State Problems](session-state.md)
- State corruption detection and recovery
- Synchronization issues between components
- Context loss and restoration
- Session cleanup problems

### 🎨 [Panel Rendering Issues](panel-rendering.md)
- Layout corruption and fixes
- State synchronization problems
- Memory leaks in panel management
- Z-index and positioning issues

### ⚡ [Execute Processing Errors](execute-processing.md)
- Malformed execute objects
- Action submission failures
- Timeout handling
- Result validation issues

## Diagnostic Tools

### Browser Developer Tools
```javascript
// Check connection state
console.log('Transport state:', TransportManager.getState());
console.log('Session state:', SessionStore.toJSON());

// Monitor events
SessionStore.on('error', (err) => console.error('Session error:', err));
TransportManager.on('transportError', (err) => console.error('Transport error:', err));
```

### Network Inspection
- Check SSE/WebSocket connections in Network tab
- Look for CORS errors in console
- Verify API endpoints are accessible

### State Inspection
```javascript
// Full state dump
console.log('SessionStore:', SessionStore.getState());
console.log('PanelManager panels:', PanelManager.getVisible().length);

// Check for inconsistencies
const store = SessionStore.getState();
if (store.status === 'waiting' && !store.pendingForm) {
  console.warn('Inconsistent waiting state');
}
```

## Emergency Recovery

### Complete Reset
```javascript
// Clear all state and reconnect
SessionStore.reset();
PanelManager.closeAll();
TransportManager.disconnect();

// Reload application
window.location.reload();
```

### Selective Recovery
```javascript
// Reset session but keep panels
SessionStore.reset(null, SessionStore.projectId);
TransportManager.connect(SessionStore.sessionId);

// Clear corrupted panels
PanelManager.getMinimized().forEach(panel => panel.destroy());
```

## Getting Help

When reporting issues, include:

1. **Browser Console Logs** - Full error messages and stack traces
2. **Network Tab Screenshots** - Failed requests and response codes
3. **State Dump** - Output of diagnostic commands above
4. **Steps to Reproduce** - Exact sequence that causes the issue
5. **Environment Info** - Browser version, OS, network conditions

## Related Documentation

- **[API Reference](../api-reference/)** - Component method details
- **[Simulations Documentation](../new-request-flow/SIMULATION-FORMAT.md)** - Working code samples
- **[Glossary](../glossary.md)** - Technical terminology
- **[Workflow Documentation](../../workflows/)** - Usage patterns