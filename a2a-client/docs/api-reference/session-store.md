# SessionStore API Reference

The SessionStore provides unified session state management as the single source of truth for all session-related data.

## Overview

```javascript
const store = SessionStore.init({
  apiBase: '/api'
});
```

## Initialization

### `SessionStore.init(options)`

Initializes the SessionStore instance.

**Parameters:**
- `options.apiBase` (string): Base API URL (default: '/api')

**Returns:** SessionStore instance

**Example:**
```javascript
const store = SessionStore.init({
  apiBase: '/api'
});
```

## State Accessors

### Core State Properties

#### `SessionStore.sessionId` (getter)
Returns the current session ID.

**Returns:** string | null

#### `SessionStore.projectId` (getter)
Returns the current project ID.

**Returns:** string | null

#### `SessionStore.messages` (getter)
Returns a copy of all messages in the session.

**Returns:** Array<Message>

#### `SessionStore.execute` (getter)
Returns the current execute object.

**Returns:** Object | null

#### `SessionStore.context` (getter)
Returns the current context object.

**Returns:** Object | null

#### `SessionStore.status` (getter)
Returns the current session status.

**Returns:** 'idle' | 'created' | 'active' | 'waiting' | 'completed' | 'error'

### `SessionStore.getState()`
Returns a complete copy of the current state.

**Returns:** Object
```javascript
{
  sessionId: string | null,
  projectId: string | null,
  messages: Array<Message>,
  execute: Object | null,
  context: Object | null,
  status: string,
  pendingForm: Object | null,
  lastError: Error | null
}
```

## Computed Properties

### `SessionStore.isWaitingForInput()`
Checks if the session is waiting for user input.

**Returns:** boolean

**Logic:** Returns true if status is 'waiting' OR pendingForm exists OR execute contains form choices.

### `SessionStore.isActive()`
Checks if the session is actively running.

**Returns:** boolean

**Logic:** Returns true if status is 'active' or 'waiting'.

### `SessionStore.isCompleted()`
Checks if the session has finished.

**Returns:** boolean

**Logic:** Returns true if status is 'completed'.

### `SessionStore.getExecution()`
Returns the current execution state from context or execute.

**Returns:** Object | null
```javascript
{
  action: string,
  step: string,
  progress: number | null
}
```

### `SessionStore.getCurrentStep()`
Returns the current execution step.

**Returns:** string | null

### `SessionStore.getProgress()`
Returns the current execution progress.

**Returns:** number | null

## State Modifiers

### `SessionStore.reset(sessionId, projectId)`
Resets the session store to initial state.

**Parameters:**
- `sessionId` (string, optional): New session ID
- `projectId` (string, optional): New project ID

**Returns:** SessionStore instance

**Emits:** `'reset'` event

### `SessionStore.setSession(sessionId, projectId)`
Sets the session and project IDs.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string, optional): Project ID

**Returns:** SessionStore instance

**Emits:** `'session'` event

### `SessionStore.setProject(projectId)`
Updates the project ID.

**Parameters:**
- `projectId` (string): Project ID

**Returns:** SessionStore instance

**Emits:** `'project'` event

### `SessionStore.setStatus(status)`
Updates the session status.

**Parameters:**
- `status` (string): New status

**Returns:** SessionStore instance

**Emits:** `'status'` event

### `SessionStore.setExecute(execute)`
Sets the current execute object and handles form/message display.

**Parameters:**
- `execute` (Object | null): Execute object

**Returns:** SessionStore instance

**Emits:** `'execute'`, `'pendingForm'` (if form), `'message'` (if message)

**Side Effects:**
- If execute contains form.choices, sets status to 'waiting' and creates pendingForm
- If execute contains message, adds message to chat

### `SessionStore.setContext(context)`
Updates the session context.

**Parameters:**
- `context` (Object | null): Context object

**Returns:** SessionStore instance

**Emits:** `'context'`, `'execution'` (if context.execution exists)

### `SessionStore.setMessages(messages)`
Replaces all messages in the session.

**Parameters:**
- `messages` (Array<Message>): Array of message objects

**Returns:** SessionStore instance

**Emits:** `'messages'` event

### `SessionStore.pushMessage(message, role)`
Adds a new message to the session.

**Parameters:**
- `message` (string | Object): Message content or message object
- `role` (string, default: 'assistant'): Message role ('user', 'assistant', 'system')

**Returns:** SessionStore instance

**Emits:** `'message'`, `'messages'` events

### `SessionStore.clearPendingForm()`
Clears the pending form state.

**Returns:** SessionStore instance

**Side Effects:** If status was 'waiting', changes to 'active'

**Emits:** `'pendingForm'` event

### `SessionStore.setError(error)`
Sets error state and status.

**Parameters:**
- `error` (Error | string): Error object or message

**Returns:** SessionStore instance

**Emits:** `'error'` event

**Side Effects:** Sets status to 'error' and adds error message to chat

## Batch Operations

### `SessionStore.applyServerResponse(data)`
Applies a complete server response to update all state fields.

**Parameters:**
- `data` (Object): Server response containing context, execute, messages, etc.

**Returns:** SessionStore instance

**Emits:** Multiple events based on updated fields

**Updates:** context, execute, messages, status, sessionId, projectId

## Event System

### `SessionStore.on(event, callback)`
Subscribes to state change events.

**Parameters:**
- `event` (string): Event name
- `callback` (Function): Event handler function

**Returns:** Function - unsubscribe function

### `SessionStore.off(event, callback)`
Unsubscribes from events.

**Parameters:**
- `event` (string): Event name
- `callback` (Function): Handler to remove

### `SessionStore.once(event, callback)`
Subscribes to an event for one-time execution.

**Parameters:**
- `event` (string): Event name
- `callback` (Function): Event handler function

**Returns:** Function - unsubscribe function

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `reset` | `Object` (full state) | Store has been reset |
| `session` | `string` (sessionId) | Session ID changed |
| `project` | `string` (projectId) | Project ID changed |
| `status` | `string` (status) | Session status changed |
| `execute` | `Object \| null` | Execute object updated |
| `context` | `Object \| null` | Context object updated |
| `execution` | `Object` | Execution state changed |
| `messages` | `Array<Message>` | Messages array updated |
| `message` | `Message` | New message added |
| `pendingForm` | `Object \| null` | Form state changed |
| `error` | `Error` | Error occurred |
| `serverResponse` | `Object` | Server response applied |

## Result Submission Helpers

### `SessionStore.buildChoiceResult(choiceId)`
Creates a choice result object and updates local state.

**Parameters:**
- `choiceId` (string): Selected choice ID

**Returns:** Object - `{ choice: choiceId }`

**Side Effects:** Clears pending form, adds choice as user message

### `SessionStore.buildMessageResult(message)`
Creates a message result object and updates local state.

**Parameters:**
- `message` (string): Message text (defaults to 'continue' if empty)

**Returns:** Object - `{ message: payload }`

**Side Effects:** Adds message as user message

### `SessionStore.buildActionResult(actionType, resultData)`
Creates an action-key shaped result object.

**Parameters:**
- `actionType` (string): Action type key
- `resultData` (Object): Action result data

**Returns:** Object - `{ [actionType]: resultData }`

## Utility Methods

### `SessionStore.toJSON()`
Returns a summary of current state for debugging.

**Returns:** Object
```javascript
{
  sessionId: string | null,
  projectId: string | null,
  status: string,
  messageCount: number,
  hasExecute: boolean,
  hasContext: boolean,
  isWaiting: boolean
}
```

### `SessionStore.debug()`
Logs current state to console for debugging.

## Message Format

Messages follow a standardized format:

```javascript
{
  id: string,           // Unique message ID
  role: string,         // 'user', 'assistant', 'system'
  content: string,      // Message text
  timestamp: string,    // ISO timestamp
  metadata: Object      // Additional data (optional)
}
```

## Usage Examples

### Basic Session Management
```javascript
const store = SessionStore.init();

// Set up session
store.setSession('sess_123', 'proj_456');

// Listen for changes
store.on('messages', (messages) => {
  updateChatUI(messages);
});

store.on('execute', (execute) => {
  handleExecute(execute);
});
```

### Form Handling
```javascript
store.on('pendingForm', (form) => {
  if (form) {
    showChoiceDialog(form);
  } else {
    hideChoiceDialog();
  }
});

// When user makes choice
const result = store.buildChoiceResult('option_1');
await actionHandler.submit(sessionId, projectId, { choice: result.choice });
```

### Error Handling
```javascript
store.on('error', (error) => {
  showErrorToast(error.message);
  // Store provides automatic error message in chat
});
```

## Related Components


- **[TransportManager](./transport-manager.md)** - Server communication
- **[PanelManager](./panel-manager.md)** - UI synchronization