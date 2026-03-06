# ActionHandler API Reference

The ActionHandler provides standardized action submission using the action-key shape pattern for all client-server communication.

## Overview

```javascript
const actionHandler = ActionHandler.init({
  apiBase: '/api'
});
```

## Initialization

### `ActionHandler.init(options)`

Initializes the ActionHandler instance.

**Parameters:**
- `options.apiBase` (string): Base API URL (default: '/api')

**Returns:** ActionHandler instance

**Example:**
```javascript
const actionHandler = ActionHandler.init({
  apiBase: '/api'
});
```

## Core Submission API

### `ActionHandler.submit(sessionId, projectId, result, context)`

Submits any action result in action-key shape.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `result` (Object): Result in action-key shape `{ [actionType]: data }`
- `context` (Object, optional): Additional context

**Returns:** Promise<Object> - Server response

**Throws:** Error if validation fails or request fails

**Validation:**
- Result must have exactly one action-type key
- Session ID and Project ID required

**Example:**
```javascript
await actionHandler.submit('sess_123', 'proj_456', {
  'script': { output: 'Hello World', success: true }
});
```

## Specific Action Methods

### Form Submissions

#### `ActionHandler.sendChoice(sessionId, projectId, choiceId)`

Submits a form choice selection.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `choiceId` (string): Selected choice ID

**Returns:** Promise<Object>

**Action-Key Shape:** `{ choice: choiceId }`

**Side Effects:** Updates SessionStore with user message and clears pending form

#### `ActionHandler.sendMessage(sessionId, projectId, text)`

Submits a message or continue signal.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `text` (string, optional): Message text (defaults to 'continue')

**Returns:** Promise<Object>

**Action-Key Shape:** `{ message: text || 'continue' }`

**Side Effects:** Updates SessionStore with user message

### Script Actions

#### `ActionHandler.submitScriptResult(sessionId, projectId, scriptResult)`

Submits script execution results.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `scriptResult` (Object): Script execution data

**Returns:** Promise<Object>

**Action-Key Shape:** `{ script: scriptResult }`

**Script Result Format:**
```javascript
{
  input: Object,     // Original input parameters
  output: string,    // Execution output
  error: string,     // Error message (if failed)
  success: boolean   // Execution success flag
}
```

### File Operations

#### `ActionHandler.submitReadFileResult(sessionId, projectId, fileResult)`

Submits file read operation results.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `fileResult` (Object): File read data

**Returns:** Promise<Object>

**Action-Key Shape:** `{ 'read-file': fileResult }`

**File Result Format:**
```javascript
{
  path: string,      // File path
  content: string,   // File content
  error: string      // Error message (if failed)
}
```

#### `ActionHandler.submitWriteFileResult(sessionId, projectId, fileResult)`

Submits file write operation results.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `fileResult` (Object): File write data

**Returns:** Promise<Object>

**Action-Key Shape:** `{ 'write-file': fileResult }`

**File Result Format:**
```javascript
{
  path: string,      // File path
  content: string,   // Written content
  success: boolean,  // Write success flag
  error: string      // Error message (if failed)
}
```

### Command Execution

#### `ActionHandler.submitCommandResult(sessionId, projectId, commandResult)`

Submits shell command execution results.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `commandResult` (Object): Command execution data

**Returns:** Promise<Object>

**Action-Key Shape:** `{ 'execute-command': commandResult }`

**Command Result Format:**
```javascript
{
  command: string,   // Executed command
  exitCode: number,  // Process exit code
  stdout: string,    // Standard output
  stderr: string     // Standard error
}
```

### RAG Search

#### `ActionHandler.submitRagSearchResult(sessionId, projectId, searchResult)`

Submits RAG search results.

**Parameters:**
- `sessionId` (string): Session ID
- `projectId` (string): Project ID
- `searchResult` (Object): RAG search data

**Returns:** Promise<Object>

**Action-Key Shape:** `{ 'rag-search': searchResult }`

**Search Result Format:**
```javascript
{
  query: string,     // Search query
  results: Array,    // Search results
  files: Array,      // Related files
  context: Object    // Additional context
}
```

## Execute Processing

### `ActionHandler.processExecute(execute)`

Normalizes any execute object to standardized format.

**Parameters:**
- `execute` (Object | null): Execute object from server

**Returns:** Object
```javascript
{
  type: string,        // Execute type ('form', 'message', 'script', etc.)
  data: Object,        // Execute data
  action: string,      // Action identifier
  isInput: boolean,    // Requires user input
  isClientAction: boolean // Client-side execution required
}
```

**Execute Types (in priority order):**
1. `finalResult` - Task completion
2. `form` - Interactive form with choices
3. `message` - Simple message display
4. `script` - JavaScript execution
5. `rag-search` - RAG search operation
6. `read-file` - File read operation
7. `write-file` - File write operation
8. `execute-command` - Shell command execution

**Usage:**
```javascript
const processed = actionHandler.processExecute(execute);

switch (processed.type) {
  case 'form':
    showChoiceDialog(processed.data);
    break;
  case 'message':
    displayMessage(processed.data);
    break;
  case 'script':
    executeScript(processed.data);
    break;
  // ... handle other types
}
```

## Context Building

### `ActionHandler.buildContext(baseContext, overrides)`

Builds context object for submissions (legacy compatibility).

**Parameters:**
- `baseContext` (Object): Base context object
- `overrides.task` (Object, optional): Task context
- `overrides.execution` (Object, optional): Execution context
- `overrides` (Object): Other context overrides

**Returns:** Object - Merged context

**Example:**
```javascript
const context = actionHandler.buildContext(
  { userId: 'user_123' },
  {
    task: { id: 'task_456' },
    execution: { step: 'validate_input' }
  }
);
```

## HTTP Communication

### `ActionHandler._request(method, path, body)` (private)

Low-level HTTP request method.

**Parameters:**
- `method` (string): HTTP method ('GET', 'POST', etc.)
- `path` (string): API path
- `body` (Object, optional): Request body

**Returns:** Promise<Object> - Parsed response data

### `ActionHandler._getHeaders()` (private)

Generates HTTP headers for requests.

**Returns:** Object - Headers with Content-Type and Authorization

**Includes:**
- `Content-Type: application/json`
- `Authorization: Bearer {token}` (if token available)

## Error Handling

ActionHandler provides comprehensive error handling:

### Validation Errors
- **Missing session/project ID**: `"Session ID and Project ID required"`
- **Invalid action-key shape**: `"Result must have exactly one action-type key"`

### HTTP Errors
- **Network failures**: Connection errors, timeouts
- **Server errors**: 4xx/5xx status codes with error messages
- **JSON parsing errors**: Malformed responses

### Error Format
```javascript
{
  message: string,    // Human-readable error message
  status: number,     // HTTP status code (if applicable)
  details: Object     // Additional error context
}
```

## Action-Key Shape Validation

All submissions are validated to ensure action-key shape compliance:

```javascript
// ✅ Valid: Exactly one action-type key
{ "script": { output: "result" } }
{ "choice": "option_1" }
{ "message": "continue" }

// ❌ Invalid: Multiple keys
{ "script": {...}, "choice": "..." }

// ❌ Invalid: No action-type key
{ "content": "result" }
{ "action": "script", "data": {...} }
```

## Integration Patterns

### With SessionStore
```javascript
// ActionHandler updates SessionStore automatically
await actionHandler.sendChoice(sessionId, projectId, 'choice_1');
// SessionStore now has cleared pendingForm and user message
```

### With TransportManager
```javascript
// Use HTTP fallback when WebSocket unavailable
if (!transportManager.isConnected()) {
  await actionHandler.submit(sessionId, projectId, result);
}
```

### Execute Processing Workflow
```javascript
// Server sends execute
transport.on('message', (data) => {
  if (data.execute) {
    const processed = actionHandler.processExecute(data.execute);

    if (processed.isInput) {
      // Handle user interaction
      handleUserInput(processed);
    } else if (processed.isClientAction) {
      // Execute client-side action
      executeClientAction(processed);
    }
  }
});
```

## Usage Examples

### Basic Form Submission
```javascript
// User selects a choice
await actionHandler.sendChoice('sess_123', 'proj_456', 'option_a');
```

### Script Result Submission
```javascript
const scriptResult = {
  input: { code: 'console.log("hello")' },
  output: 'hello\n',
  success: true
};

await actionHandler.submitScriptResult('sess_123', 'proj_456', scriptResult);
```

### File Operation Submission
```javascript
// File read result
await actionHandler.submitReadFileResult('sess_123', 'proj_456', {
  path: '/config.json',
  content: '{"setting": "value"}'
});

// File write result
await actionHandler.submitWriteFileResult('sess_123', 'proj_456', {
  path: '/output.txt',
  content: 'Generated content',
  success: true
});
```

### Command Execution Submission
```javascript
await actionHandler.submitCommandResult('sess_123', 'proj_456', {
  command: 'ls -la',
  exitCode: 0,
  stdout: 'total 42\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .\n',
  stderr: ''
});
```

### Execute Processing
```javascript
function handleExecute(execute) {
  const processed = actionHandler.processExecute(execute);

  switch (processed.type) {
    case 'form':
      // Show choices to user
      showChoices(processed.data.choices);
      break;

    case 'message':
      // Display message, wait for continue
      showMessage(processed.data.content || processed.data);
      break;

    case 'script':
      // Execute JavaScript
      executeScript(processed.data.code);
      break;

    case 'read-file':
      // Read file from filesystem
      readFile(processed.data.path);
      break;

    // ... handle other action types
  }
}
```

### Error Handling
```javascript
try {
  await actionHandler.submit(sessionId, projectId, result);
} catch (error) {
  console.error('Action submission failed:', error.message);

  // Handle specific error types
  if (error.message.includes('action-type key')) {
    // Fix action-key shape
    result = fixActionKeyShape(result);
    await actionHandler.submit(sessionId, projectId, result);
  }
}
```

## HTTP Endpoints

ActionHandler communicates with these server endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/sessions/{sessionId}/result` | Submit action results |

## Related Components

- **[SessionStore](../api-reference/session-store.md)** - State management and updates
- **[TransportManager](../api-reference/transport-manager.md)** - Real-time communication
- **[PanelManager](../api-reference/panel-manager.md)** - UI coordination