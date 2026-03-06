# Progress Indicators Guide

## Overview

The Progress Indicators system provides visual progress tracking for long-running operations in the A2A Script Agent web interface. It integrates seamlessly with session operations, SSE events, and provides a cancel/stop functionality.

## Features

- **Loading state for POST /api/sessions/:id/next** - Automatic progress tracking for session operations
- **"Running…" status with promiseId polling** - Real-time progress updates via promiseId
- **Cancel/stop updates UI** - User can cancel long-running operations
- **Integration with SSE events** - Automatic progress updates from server events
- **Multiple progress types** - Determinate, indeterminate, and error states
- **Responsive design** - Works on desktop and mobile devices

## Quick Start

### Basic Usage

```javascript
// Create a progress tracker
const tracker = ProgressIndicators.create('my-operation', {
    showLabel: true,
    showMessage: true,
    showPercentage: true
});

// Render to container
tracker.renderTo('progress-container', {
    id: 'my-operation',
    showPercentage: true
});

// Update progress
tracker.setProgress(50, 'Processing step 2 of 4');

// Complete operation
tracker.complete('Operation completed successfully!');
```

### Session Progress Tracking

```javascript
// Handle session operation response with promiseId
const sessionId = 'session-123';
const response = {
    promiseId: 'promise-abc-123',
    message: 'Starting long-running operation...'
};

// Start progress tracking
SessionProgressManager.handleSessionNextResponse(sessionId, response)
    .then(progressId => {
        console.log('Progress started:', progressId);
        // Progress will be automatically updated via polling
    });
```

## API Reference

### ProgressIndicators

#### Methods

- `create(id, options)` - Create a new progress tracker
- `get(id)` - Get tracker by ID
- `remove(id)` - Remove tracker
- `handleProgressEvent(eventData)` - Handle progress events from SSE
- `on(event, callback)` - Subscribe to events
- `emit(event, data)` - Emit events
- `renderTo(containerId, options)` - Render progress bar to container

#### Options

```javascript
{
    animated: true,           // Enable animations
    showPercentage: true,     // Show percentage text
    showMessage: true,        // Show message text
    indeterminateSpeed: 300,  // Animation speed
    autoRemove: true          // Auto-remove on completion
}
```

### ProgressTracker

#### Methods

- `setProgress(percent, message)` - Set determinate progress (0-100)
- `setIndeterminate(message)` - Set indeterminate progress
- `setMessage(message)` - Set message without progress
- `complete(message)` - Mark as complete
- `error(message)` - Mark as error
- `reset()` - Reset tracker
- `destroy()` - Destroy tracker

#### States

- `idle` - Initial state
- `indeterminate` - Animated progress without specific percentage
- `determinate` - Progress with specific percentage
- `complete` - Operation completed
- `error` - Operation failed

### SessionProgressManager

#### Methods

- `startSessionProgress(sessionId, operation, options)` - Start progress for session operation
- `pollPromiseId(sessionId, promiseId, progressId)` - Poll for promiseId status
- `handleSessionNextResponse(sessionId, response)` - Handle session next response
- `cancelSessionOperation(sessionId, operation)` - Cancel session operation
- `cleanup()` - Clean up all session progress

## Integration Examples

### With SessionManager

The Progress Indicators system automatically integrates with the SessionManager if available:

```javascript
// Automatic integration (handled in progress-indicators.js)
if (global.SessionManager) {
    const originalNext = global.SessionManager.next;
    global.SessionManager.next = async function(sessionId, data) {
        const result = await originalNext.call(this, sessionId, data);
        
        // Handle progress tracking
        if (result && result.promiseId) {
            await SessionProgressManager.handleSessionNextResponse(sessionId, result);
        }
        
        return result;
    };
}
```

### With SSE Events

```javascript
// Automatic integration with SSE client
if (global.SSEClient) {
    global.SSEClient.on('progress', (data) => {
        ProgressIndicators.handleProgressEvent(data);
    });
    
    global.SSEClient.on('complete', (data) => {
        ProgressIndicators.emit('complete', data);
    });
    
    global.SSEClient.on('error', (data) => {
        ProgressIndicators.emit('error', data);
    });
}
```

### Manual Integration

```javascript
// Handle progress events manually
ProgressIndicators.on('progress', (data) => {
    console.log(`Progress: ${data.progress}% - ${data.message}`);
});

ProgressIndicators.on('complete', (data) => {
    console.log(`Complete: ${data.id}`);
});

ProgressIndicators.on('error', (data) => {
    console.error(`Error: ${data.message}`);
});
```

## CSS Classes

### Progress Container

```css
.session-progress-wrapper {
    /* Container styling */
}

.progress-indicator {
    /* Base progress indicator */
}

.progress-indicator.state-indeterminate {
    /* Indeterminate state */
}

.progress-indicator.state-determinate {
    /* Determinate state */
}

.progress-indicator.state-complete {
    /* Complete state */
}

.progress-indicator.state-error {
    /* Error state */
}
```

### Progress Elements

```css
.progress-bar-container {
    /* Progress bar container */
}

.progress-bar {
    /* Progress bar itself */
}

.progress-bar.indeterminate {
    /* Indeterminate animation */
}

.progress-bar.animated {
    /* Animation styles */
}

.progress-label {
    /* Label text */
}

.progress-percentage {
    /* Percentage text */
}

.progress-message {
    /* Message text */
}

.progress-cancel-btn {
    /* Cancel button */
}
```

## Events

### Progress Events

- `progress` - Fired when progress updates
- `complete` - Fired when operation completes
- `error` - Fired when operation fails

### Event Data

```javascript
// Progress event
{
    id: 'progress-id',
    progress: 50,
    message: 'Processing...'
}

// Complete event
{
    id: 'progress-id'
}

// Error event
{
    id: 'progress-id',
    message: 'Operation failed'
}
```

## Best Practices

### 1. Use Appropriate Progress Type

```javascript
// For known progress
tracker.setProgress(75, 'Step 3 of 4 completed');

// For unknown progress
tracker.setIndeterminate('Processing...');

// For errors
tracker.error('Failed to process file');
```

### 2. Handle Cancellation

```javascript
// Always provide cancellation option for long operations
const canCancel = true;
if (canCancel) {
    tracker.renderTo('container', {
        id: 'operation',
        showCancel: true
    });
}
```

### 3. Update Progress Regularly

```javascript
// Update progress frequently for better UX
setInterval(() => {
    const progress = calculateProgress();
    tracker.setProgress(progress.percent, progress.message);
}, 1000);
```

### 4. Clean Up

```javascript
// Always clean up when done
tracker.complete('Done');
setTimeout(() => {
    ProgressIndicators.remove('operation');
}, 2000);
```

## Troubleshooting

### Progress Not Updating

1. Check if progress events are being fired
2. Verify progress ID matches
3. Ensure tracker is properly initialized

### Cancel Button Not Working

1. Check if cancel handler is attached
2. Verify API endpoint for cancellation
3. Ensure proper error handling

### Styling Issues

1. Check CSS file is loaded
2. Verify CSS classes match
3. Check for CSS conflicts

## Examples

See `js/progress-example.js` for complete usage examples including:
- Manual progress tracking
- Session progress with promiseId
- File operation progress
- Batch operation progress
- Error handling

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- IE 11+ (with polyfills)