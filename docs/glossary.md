# Technical Glossary

This glossary provides definitions for key terms and concepts used throughout the A2A Script Agent system.

## Core Concepts

### Session
A unique conversation instance between a user and the AI system. Sessions maintain state across multiple interactions and contain:
- **Session ID**: Unique identifier for the session
- **Project ID**: Identifier for the associated project/workspace
- **Messages**: History of user and assistant interactions
- **Execute State**: Current action being processed
- **Context**: Additional session metadata

### Execute
The current action or task being processed by the system. Execute objects define what the client should do next:
- **Form**: Interactive form requiring user input (choices, text input)
- **Message**: Simple message display (no user input required)
- **Script**: JavaScript code execution in sandboxed environment
- **File Operations**: Read/write file system operations
- **RAG Search**: Retrieval-Augmented Generation search
- **Command Execution**: Shell command execution

### Action-Key Shape
Standardized format for all result and execute objects where the action type is used as the key:

```json
{
  "result": { "script": { "output": "..." } },
  "execute": { "read-file": { "path": "/file.txt" } }
}
```

### Context
System-managed state object containing:
- **History**: Array of all execution records and steps taken
- **Execution**: Current execution state (`{ action, step, progress }`)
- **Workbench**: Structured working state (`sections`, optional `batch`, optional `slots`). LLM can update `workbench.sections` (merge) and `workbench_ops` (short set/append/remove commands)

## API Terminology

### SessionStore
Singleton component providing unified session state management:
- **State Accessors**: `getState()`, `get sessionId()`, `get messages()`, `get execute()`
- **Computed Properties**: `isWaitingForInput()`, `isActive()`, `isCompleted()`
- **Actions**: `reset()`, `setExecute()`, `pushMessage()`, `setContext()`
- **Event System**: Emits events like `'messages'`, `'execute'`, `'status'`

### APIIntegration
Handles communication between client and server using HTTP:
- **Base**: Client API endpoint (e.g., `/api/a2a/`)
- **Methods**: GET projects, sessions; POST sessions, messages, choices
- **Async Polling**: `GET /sessions/:id/async` for async results

### WindowRegistry
Manages the registry of open session windows:
- **State**: localStorage key `a2a_session_windows`
- **Methods**: `getWindow()`, `hasWindow()`, `getAllSessionIds()`, `saveSessionWindowsState()`

### ActionHandler
Standardized interface for submitting all types of action results:
- **Generic Submit**: `submit(sessionId, projectId, result, context)`
- **Specific Methods**: `sendChoice()`, `sendMessage()`, `submitScriptResult()`
- **Execute Processing**: `processExecute()` - normalizes any execute type
- **Action-Key Validation**: Ensures exactly one action-type key per submission

## Workflow Terms

### Session Lifecycle
The complete lifecycle of a session from creation to completion:

1. **Created**: Initial session setup with ID and project
2. **Active**: Session has ongoing execution
3. **Waiting**: Session paused for user input (form/message)
4. **Completed**: Session finished successfully
5. **Error**: Session terminated due to error

### Communication Patterns

#### Synchronous HTTP
- **Direction**: Client-to-server (request/response)
- **Usage**: All requests return complete response in HTTP body
- **Includes**: `execute.ui` with state, form choices, messages
- **No streaming required**: Single HTTP request/response cycle

#### HTTP POST
- **Direction**: Client-to-server
- **Usage**: Action result submissions, fallback messaging
- **Endpoints**: `/api/sessions/{sessionId}/result`

### State Synchronization
Mechanisms ensuring consistent state across components:
- **SessionStore**: Single source of truth for session state
- **Context Propagation**: Automatic context updates via `setContext()`
- **Event-Driven Updates**: Components react to store events
- **Batch Updates**: `applyServerResponse()` for bulk state changes

## Domain-Specific Terms

### A2A Protocol
The Agent-to-Agent communication protocol defining:
- **Request Flow**: Standardized request/response format
- **Action Types**: Categorized as Actions (hardcoded) vs AI-Actions (LLM-driven)
- **Execute Types**: Client-side actions vs UI-only interactions
- **Result Processing**: Action-key shaped result objects

### Simulation Pipeline
Automated testing framework using golden standard simulations:

```
request.json → server-transforms-request.json → request.md
    ↓ (LLM Processing)
response.md → server-transforms-response.json → response.json
```

### Transform Templates
Reusable templates for converting between formats:
- **Request Transform**: `server-transforms-request.json`
- **Response Transform**: `server-transforms-response.json`
- **Purpose**: Standardize LLM input/output processing

### Promise Queue Architecture
Advanced queuing system for handling async operations:
- **Promise States**: `pending`, `processing`, `completed`, `failed`
- **Queue Management**: Priority-based execution
- **State Synchronization**: Cross-component state updates
- **Retry Logic**: Automatic retry with exponential backoff

## Error Handling Terms

### Transport Errors
Communication layer failures:
- **CORS Blocking**: Cross-origin resource sharing restrictions
- **Network Failures**: Connection timeouts, DNS issues
- **Reconnection Logic**: Automatic fallback and retry mechanisms
- **Heartbeat Timeout**: Connection health monitoring failures

### Session State Corruption
State management issues:
- **Synchronization Issues**: State divergence between components
- **Context Loss**: Missing or corrupted context data
- **Session Recovery**: Automatic state restoration mechanisms
- **Cleanup Problems**: Incomplete session termination

### Execute Processing Errors
Action execution failures:
- **Malformed Objects**: Invalid execute/result structure
- **Action Submission Failures**: Network or server errors
- **Timeout Handling**: Long-running operation timeouts
- **Result Validation**: Incorrect action-key shape or data format

## Performance Terms

### Memory Management
Resource optimization strategies:
- **Leak Prevention**: Proper event listener cleanup
- **Object Lifecycle**: Controlled creation/destruction patterns
- **Garbage Collection**: Efficient memory cleanup
- **Session Cleanup**: Removing unused session data

### Network Optimization
Communication efficiency:
- **Payload Reduction**: Minimizing data transfer size
- **Connection Pooling**: Reusing connections efficiently
- **Caching Layers**: Local and server-side caching
- **Bandwidth Management**: Adaptive data transmission

### UI Rendering Performance
Interface responsiveness:
- **Virtual Scrolling**: Efficient large list rendering
- **Debounced Updates**: Throttled UI state changes
- **DOM Optimization**: Minimized DOM manipulation
- **Animation Performance**: Hardware-accelerated transitions

## Security Terms

### Client-Side Security
Browser environment protection:
- **Script Sandboxing**: Isolated code execution
- **Input Validation**: Sanitized user input processing
- **XSS Prevention**: Cross-site scripting protection
- **Content Security Policy**: Resource loading restrictions

### Transport Security
Communication layer protection:
- **HTTPS Requirements**: Encrypted connections
- **Authentication**: Token-based access control
- **Secure HTTP Channels**: TLS/HTTPS for all HTTP endpoints
- **Certificate Validation**: SSL/TLS certificate verification

### Data Protection
Information security measures:
- **Session Encryption**: Encrypted session data storage
- **Secure Storage**: Protected local storage practices
- **Sensitive Data Handling**: PII and credential protection
- **Audit Logging**: Security event tracking
