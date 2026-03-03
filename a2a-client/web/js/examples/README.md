# AI Actions Integration Examples

This directory contains example code and integration patterns for the AI Actions Session Panel.

## Files

### `ai-actions-integration.js`
Complete integration example showing how to:
- Initialize the AI Actions Session Panel
- Handle session and action events
- Create example sessions and actions
- Demonstrate all panel features

### `README.md`
This file - documentation for the integration examples.

## Usage

### Basic Integration

1. **Include the integration file:**
```html
<script src="js/examples/ai-actions-integration.js"></script>
```

2. **Initialize automatically:**
The integration will automatically initialize when the page loads and dependencies are ready.

3. **Use global functions for testing:**
```javascript
// Initialize integration
const integration = await global.aiActionsExample.init();

// Create example sessions
global.aiActionsExample.createExample();

// Demonstrate API
global.aiActionsExample.demonstrateAPI();

// Clear all sessions
global.aiActionsExample.clearSessions();
```

### Manual Integration

For more control, you can manually initialize the integration:

```javascript
// Wait for dependencies
await waitForDependencies();

// Create integration instance
const integration = new AIActionsIntegrationExample();

// Initialize
await integration.init();

// Use the panel
const panel = integration.panel;
```

## Event Examples

The integration demonstrates handling various events:

### Session Events
- `session-created` - When a new session is created
- `session-status-update` - When session status changes
- `session-switch` - When switching between sessions

### Action Events
- `action-added` - When a new action is added to a session
- `ai-action-executed` - When an AI action is executed
- `ai-action-error` - When an AI action encounters an error

## Testing

Use the browser console to test the integration:

```javascript
// Check if integration is ready
global.aiActionsPanel !== undefined

// Get all sessions
global.aiActionsPanel.getAllSessions()

// Create new session
global.aiActionsPanel.createSession('test-session')

// Add action to session
global.aiActionsPanel.addActionToSession('test-session', {
    type: 'message',
    content: 'Hello World!',
    status: 'completed'
})
```

## Debug Mode

Enable debug mode for detailed logging:

```javascript
// In the integration file, set debug: true
const panel = new AIActionsSessionPanel(container, {
    debug: true
});
```

## Customization

You can customize the integration by:

1. **Modifying event handlers** in the `setupEventHandlers()` method
2. **Adding new action types** in the `demonstrateActionTypes()` method
3. **Customizing the panel options** in the `createPanel()` method
4. **Adding new example sessions** in the `createExampleSessions()` method

## Integration Patterns

### Pattern 1: Event-Driven Integration
```javascript
// Listen for events from your application
document.addEventListener('your-app-event', (event) => {
    const { data } = event.detail;
    
    // Convert to panel format
    const action = convertToPanelAction(data);
    
    // Add to panel
    panel.addActionToSession(currentSessionId, action);
});
```

### Pattern 2: Direct API Integration
```javascript
// Directly call panel methods
panel.createSession('my-session');
panel.addActionToSession('my-session', actionData);
panel.updateSessionStatus('my-session', 'completed');
```

### Pattern 3: State Synchronization
```javascript
// Synchronize with your application state
function syncWithAppState() {
    const appState = getAppState();
    
    // Update panel based on app state
    appState.sessions.forEach(session => {
        panel.createSession(session.id, session.data);
        session.actions.forEach(action => {
            panel.addActionToSession(session.id, action);
        });
    });
}
```

## Troubleshooting

### Common Issues

1. **Panel not loading**
   - Check that all dependencies are loaded
   - Verify CSS files are included
   - Check browser console for errors

2. **Events not firing**
   - Ensure events are dispatched with correct format
   - Check event listener registration
   - Verify event names match

3. **Actions not displaying**
   - Check action data structure
   - Verify session exists before adding actions
   - Check action type is supported

### Debug Commands

```javascript
// Check panel state
console.log('Panel:', global.aiActionsPanel);

// Check all sessions
console.log('Sessions:', global.aiActionsPanel.getAllSessions());

// Check current session
console.log('Current:', global.aiActionsPanel.getCurrentSession());

// Check panel DOM
console.log('Panel DOM:', global.aiActionsPanel.container);
```

## Best Practices

1. **Use descriptive session IDs** for better debugging
2. **Handle errors gracefully** in event handlers
3. **Clean up resources** when integration is destroyed
4. **Test with real data** to ensure compatibility
5. **Monitor performance** with large numbers of actions

## Contributing

When adding new examples:

1. **Follow the existing code style**
2. **Add comments for complex logic**
3. **Include error handling**
4. **Test thoroughly**
5. **Update this README** with new examples

## Support

For questions about integration:
- Check the troubleshooting section
- Review the main documentation
- Use debug mode for detailed logging
- Check browser console for errors