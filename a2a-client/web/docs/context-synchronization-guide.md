# Context Synchronization Guide

This document describes how SessionManager, SessionSync, and SessionViewModel handle context synchronization in the A2A Web UI, including execute.forms/messages processing, context.execution.step updates, and PlasticineUI panel behavior.

## Related Workflows

For implementation of these synchronization patterns in workflows:
- **[Session Lifecycle Scenarios](../workflows/session-lifecycle/)** - Session state management and transitions
- **[Task Execution Scenarios](../workflows/task-execution/)** - Execute processing and context updates
- **[Communication Scenarios](../workflows/communication/)** - Real-time context synchronization via SSE/WebSocket
- **[UI Interaction Scenarios](../workflows/ui-interactions/)** - Panel behavior and state synchronization

## Table of Contents

1. [SessionManager Architecture](#sessionmanager-architecture)
2. [SessionSync Event Handling](#sessionsync-event-handling)
3. [SessionViewModel State Management](#sessionviewmodel-state-management)
4. [Execute Processing Flow](#execute-processing-flow)
5. [PlasticineUI Panel Lifecycle](#plasticineui-panel-lifecycle)
6. [Context Reconciliation Strategy](#context-reconciliation-strategy)
7. [Message Normalization & Pruning](#message-normalization--pruning)
8. [Testing Scenarios](#testing-scenarios)

## SessionManager Architecture

### Core Components

```javascript
SessionManager {
  // State
  currentSessionId: string | null
  currentProjectId: string | null
  sessions: Session[]
  _currentContext: Context | null
  _pendingForm: Form | null

  // Methods
  processExecute(execute, context)
  submitChoice(choiceId)
  submitFormInput(inputData)
  handleSSEMessage(data)
}
```

### Context Processing Flow

```mermaid
graph TD
    A[SSE Message Received] --> B{has execute?}
    B -->|Yes| C[processExecute(execute, context)]
    B -->|No| D{has context?}
    D -->|Yes| E[update _currentContext]
    D -->|No| F{has messages?}
    F -->|Yes| G[append messages]
    F -->|No| H[handle legacy format]
```

### Protocol v2.0 Execute Types

| Execute Type | Handler | Description | UI Response |
|-------------|---------|-------------|-------------|
| `execute.form` | `processExecute` → `formReceived` event | Interactive choice/action selection | Show form panel with choices |
| `execute.message` | `processExecute` → `messageReceived` event | UI-only informational message | Append to conversation |
| `execute.script` | `processExecute` → `scriptReceived` event | JavaScript execution request | Show script input panel |
| `execute['rag-search']` | `processExecute` → `ragSearchReceived` event | RAG search request | Show search panel |
| `execute['read-file']` | `processExecute` → `readFileReceived` event | File read request | Show file selector |
| `execute['write-file']` | `processExecute` → `writeFileReceived` event | File write request | Show file save dialog |
| `execute['execute-command']` | `processExecute` → `executeCommandReceived` event | Shell command request | Show command panel |

### Action-Key Result Format

All results sent to server use action-key shape:

```typescript
// Result format sent to /api/sessions/:id/result
{
  "choice": "selected_choice_id"  // for form choices
}

// or
{
  "script": {                     // for script execution
    "output": "...",
    "error": "...",
    "executionTime": 123
  }
}

// or
{
  "read-file": {                   // for file operations
    "path": "/path/to/file",
    "content": "...",
    "encoding": "utf8"
  }
}
```

## SessionSync Event Handling

### SSE Event Registration

```javascript
SessionSync = {
  // Core event handlers
  register('message', handleMessage)
  register('task_response', handleTaskResponse)
  register('session_update', handleSessionUpdate)
  register('progress', handleProgress)
  register('complete', handleComplete)
  register('error', handleError)
}
```

### Event Processing Logic

```javascript
function register(event, handler) {
  sse.on(event, (data) => {
    try {
      handler(data);
    } catch (err) {
      logError(event, err);
    }
  });
}

// Message events
register('message', data => {
  pushMessage(data?.message ?? data?.content ?? data, data?.role || 'assistant');
});

// Context updates
register('task_response', data => {
  applyContext(data?.context);
  applyExecute(data?.execute);
});

// Session state sync
register('session_update', data => {
  applyContext(data?.context);
  if (data?.execute) applyExecute(data.execute);
});

// Progress indicators
register('progress', data => {
  updateProgress(data);
});
```

### Context Application

```javascript
function applyContext(context) {
  if (!context) return;

  // Sync messages
  if (Array.isArray(context.messages)) {
    vm.setMessages(context.messages);
  }

  // Sync execute state
  if (context.execute) {
    applyExecute(context.execute);
  }

  // Sync execution progress
  if (context.execution) {
    const merged = {...vm.execute, ...context.execution};
    vm.setExecute(merged);
  }
}

function applyExecute(execute) {
  if (!execute) return;
  vm.setExecute(execute);
  if (execute.message) {
    pushMessage(execute.message, 'assistant');
  }
}
```

## SessionViewModel State Management

### State Structure

```javascript
SessionViewModel {
  sessionId: string | null
  projectId: string | null
  messages: Message[]          // max 200, normalized
  execute: Execute | null      // current execution state
  _listeners: Map<Event, Set<Handler>>
}
```

### Message Normalization

```javascript
function normalizeMessage(value, defaultRole = 'system') {
  if (!value) return null;

  const role = value.role || defaultRole;
  const content = typeof value === 'string'
    ? value
    : (value.content || value.message || value.text || '');

  if (!content) return null;

  return {
    id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    role,
    content: String(content),
    timestamp: value.timestamp || new Date().toISOString(),
    metadata: value.metadata ? {...value.metadata} : {}
  };
}
```

### Message Buffer Management

```javascript
// Maintain max 200 messages with FIFO eviction
pushMessage(message, role) {
  const normalized = normalizeMessage(message, role);
  if (!normalized) return this;

  const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
  this.messages = next;

  this.emit('message', normalized);
  this.emit('messages', [...this.messages]);
  return this;
}
```

## Execute Processing Flow

### Form Processing

```javascript
// When execute.form received
processExecute(execute) {
  if (execute?.form) {
    this._pendingForm = execute.form;
    this.emit('formReceived', execute.form);

    // UI shows form panel with choices
    // User selects choice → submitChoice(choiceId)
    // → POST /api/sessions/:id/result { choice: choiceId }
  }
}
```

### Message Processing

```javascript
// When execute.message received
processExecute(execute) {
  if (execute?.message) {
    const message = typeof execute.message === 'string'
      ? { content: execute.message }
      : execute.message;

    this.emit('messageReceived', message);

    // UI appends to conversation
    // No server response needed (UI-only)
  }
}
```

### Execution Step Tracking

```javascript
processExecute(execute, context) {
  // Track execution steps for UI visualization
  if (context?.execution?.step) {
    const stepName = context.execution.step;
    const isLlmRequest = stepName === 'llm-request' || context.execution.action?.startsWith('ai-');

    this.emit('executionStep', {
      step: stepName,
      action: context.execution.action,
      isLlmRequest,
      displayName: isLlmRequest ? 'llm-request' : stepName
    });
  }

  // Track execution progress
  if (context?.execution?.progress !== undefined) {
    this.emit('executionProgress', {
      progress: context.execution.progress,
      action: context.execution.action,
      step: context.execution.step
    });
  }
}
```

## PlasticineUI Panel Lifecycle

### Panel States

```javascript
Panel States:
- 'expanded'     // Full panel visible
- 'minimized'    // Hidden, cube visible
- 'docked-left'  // Narrow strip on left
- 'docked-right' // Narrow strip on right
- 'docked-bottom'// Narrow strip at bottom
- 'status-tray'  // Minimized to taskbar
- 'drawer-left'  // In left drawer
- 'drawer-right' // In right drawer
- 'closed-via-cube' // Closed but cube visible
```

### Panel Creation Flow

```javascript
PlasticineUI.addPanel(opts) {
  // 1. Create DOM elements
  const panelEl = createPanelDOM(opts);
  const cubeEl = createCubeDOM(opts.id, opts.critical);

  // 2. Position cube non-overlapping
  const pos = this._findNonOverlappingCubePosition();
  cubeEl.style.left = pos.x + 'px';
  cubeEl.style.top = pos.y + 'px';

  // 3. Create PlasticinePanel instance
  const panel = new PlasticinePanel(panelEl, {
    id: opts.id,
    critical: opts.critical,
    zonesContainer: this.zonesContainer,
    ui: this,
    onClose: () => this.removePanel(opts.id)
  });

  // 4. Register panel and cube
  this.panels.set(opts.id, panel);
  this.cubes.set(opts.id, cubeEl);
}
```

### State Transitions

```javascript
Panel.setState(newState) {
  // Hide all states
  container.classList.remove('expanded', ...DOCK_STATES);

  // Apply new state
  container.classList.add(newState);
  this.state = newState;

  // Position/size based on state
  switch (newState) {
    case 'expanded':
      styles.width = styles.height = '';
      styles.left = styles.top = '';
      break;
    case 'docked-left':
      styles.width = '60px';
      styles.height = 'calc(100vh - 100px)';
      styles.left = '10px';
      styles.top = '50px';
      break;
    // ... other states
  }

  // Update cube visibility
  if (cubeEl) {
    cubeEl.classList.toggle('visible',
      ['minimized', 'status-tray', 'closed-via-cube'].includes(newState));
  }

  this.onStateChange(this.state);
}
```

## Context Reconciliation Strategy

### Duplicate Detection

```javascript
// In SessionSync - detect duplicate execution steps
register('session_update', data => {
  if (data?.context?.execution?.step) {
    const currentStep = vm.execute?.step;
    const newStep = data.context.execution.step;

    if (currentStep === newStep) {
      console.warn('[SessionSync] Duplicate execution step:', newStep);
      // Could implement deduplication logic here
    }
  }

  applyContext(data?.context);
});
```

### Out-of-Order Resolution

```javascript
// Message ordering with sequence numbers
function handleMessage(data) {
  if (data.sequence !== undefined) {
    const currentMaxSeq = Math.max(...vm.messages
      .filter(m => m.metadata?.sequence !== undefined)
      .map(m => m.metadata.sequence), 0);

    if (data.sequence <= currentMaxSeq) {
      console.warn('[SessionSync] Out-of-order message:', data.sequence);
      // Could buffer and reorder here
    }
  }

  pushMessage(data);
}
```

### Progress Synchronization

```javascript
// Handle competing progress updates
function updateProgress(progressData) {
  const progress = progressData.progress || progressData.percentage;
  if (progress == null) return;

  const current = vm.execute || {};

  // Only update if progress is advancing (prevent regressions)
  if (progress >= (current.progress || 0)) {
    vm.setExecute({...current, progress});
  }
}
```

## Message Normalization & Pruning

### Message Lifecycle

```javascript
// 1. Message received via SSE
register('message', data => {
  pushMessage(data?.message ?? data?.content ?? data, data?.role || 'assistant');
});

// 2. Normalization in SessionViewModel
pushMessage(message, role) {
  const normalized = normalizeMessage(message, role);
  if (!normalized) return this;

  // 3. Buffer management (FIFO, max 200)
  const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
  this.messages = next;

  // 4. Emit events for UI updates
  this.emit('message', normalized);
  this.emit('messages', [...this.messages]);

  return this;
}
```

### Content Types

```javascript
normalizeMessage(value, defaultRole) {
  // Handle string content
  if (typeof value === 'string') {
    return { content: value, role: defaultRole };
  }

  // Handle object with various content fields
  const content = value.content || value.message || value.text || '';

  return {
    id: value.id || generateId(),
    role: value.role || defaultRole,
    content: String(content),
    timestamp: value.timestamp || new Date().toISOString(),
    metadata: value.metadata || {}
  };
}
```

## Testing Scenarios

### Critical Test Cases

```typescript
// 1. Execute Form Flow
test('form submission updates context', async ({ page }) => {
  // Receive execute.form
  await simulateSSEMessage('session_update', {
    execute: { form: { choices: [...] } },
    context: { execution: { step: 'form-step' } }
  });

  // Verify form displayed
  await expect(page.locator('[data-testid="form-panel"]')).toBeVisible();

  // Submit choice
  await page.click('[data-testid="choice-1"]');

  // Verify context updated
  await expect(page.locator('[data-testid="execution-step"]')).toHaveText('form-step');
});

// 2. Message Ordering
test('messages maintain order under load', async ({ page }) => {
  // Send messages out of order
  await simulateSSEMessage('message', { content: 'Msg 3', sequence: 3 });
  await simulateSSEMessage('message', { content: 'Msg 1', sequence: 1 });
  await simulateSSEMessage('message', { content: 'Msg 2', sequence: 2 });

  // Verify UI shows correct order
  const messages = page.locator('.message');
  await expect(messages.nth(0)).toContainText('Msg 1');
  await expect(messages.nth(1)).toContainText('Msg 2');
  await expect(messages.nth(2)).toContainText('Msg 3');
});

// 3. Panel State Persistence
test('panel layouts survive reconnection', async ({ page }) => {
  // Create and arrange panels
  await createPanel('session-panel');
  await createPanel('log-panel');

  // Dock panels
  await dockPanel('session-panel', 'left');
  await dockPanel('log-panel', 'right');

  // Simulate disconnect/reconnect
  await simulateDisconnect();
  await simulateReconnect();

  // Verify panels maintain positions
  await expect(page.locator('#session-panel.docked-left')).toBeVisible();
  await expect(page.locator('#log-panel.docked-right')).toBeVisible();
});
```

### Load Testing Scenarios

```typescript
// High-frequency SSE events
test('handles 100 messages per second', async ({ page }) => {
  const startTime = Date.now();

  // Send burst of messages
  for (let i = 0; i < 1000; i++) {
    await simulateSSEMessage('message', {
      content: `Load test message ${i}`,
      timestamp: Date.now()
    });
  }

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(10000); // Complete within 10 seconds

  // Verify UI remains responsive
  await expect(page.locator('.message').count()).toBeGreaterThan(900);
});

// Memory usage under load
test('memory usage stays bounded', async ({ page }) => {
  const initialMetrics = await page.metrics();

  // Generate load
  for (let i = 0; i < 100; i++) {
    await simulateSSEMessage('message', { content: `Memory test ${i}` });
    await page.waitForTimeout(100);
  }

  const finalMetrics = await page.metrics();
  const memoryGrowth = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;

  // Memory growth should be reasonable (< 50MB)
  expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
});
```

This guide provides comprehensive coverage of the context synchronization mechanisms in the A2A Web UI. For implementation details, refer to the source code in `session-manager.js`, `session-sync.js`, and `session-view-model.js`.