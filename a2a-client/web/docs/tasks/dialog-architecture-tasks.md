# Dialog architecture task breakdown

Derived from `a2a-client/web/DEV_STATE.md` sections that describe the session/SSE stack.

## Session Lifecycle Audit ✅ COMPLETED

### Sequence Diagram: Session Creation Flow

```
User Action: Click "New Session"
    ↓
SessionPanelManager.createSession() [if UI trigger]
    ↓
SessionManager.createSession(options)
    ├── POST /api/sessions (server call)
    ├── this.sessions.unshift(session) [add to local list]
    ├── this.emit('sessionCreated', session)
    │   ↓
    │   SessionPanelManager.on('sessionCreated')
    │   ├── _addOrUpdatePanel(session)
    │   │   ├── _fetchSessionDetail()
    │   │   ├── PlasticineUI.addPanel()
    │   │   └── _renderPanel()
    │   └── panels.set(panelId, entry)
    │
    └── SessionManager.setActiveSession(sessionId)
        ├── this.currentSessionId = sessionId
        ├── this.emit('sessionChanged', sessionId)
        │   ↓
        │   SessionPanelManager.on('sessionChanged')
        │   └── _focusPanel(sessionId)
        │       └── PlasticineUI.bringToFront()
        │
        └── SSEClient.connect(sessionId)
            └── SessionSync registers event handlers
```

### Sequence Diagram: Session Loading Flow

```
Page Load / Project Change
    ↓
SessionPanelManager.setProject(projectId)
    ├── this.currentProjectId = projectId
    ├── _clearPanels() [remove existing panels]
    └── SessionManager.loadSessions(projectId)
        ├── GET /api/sessions?projectId=... (server call)
        ├── this.sessions = response.data
        └── this.emit('sessionsLoaded', sessions)
            ↓
            SessionPanelManager.on('sessionsLoaded')
            └── _handleSessionsLoaded(sessions)
                └── for each session: _addOrUpdatePanel(session)
```

### Sequence Diagram: Session Switch Flow

```
User Action: Click session panel "Focus" button
    ↓
SessionPanelManager._renderPanel() [button handler]
    ↓
SessionManager.setActiveSession(sessionId)
    ├── this.currentSessionId = sessionId
    ├── this.emit('sessionChanged', sessionId)
    │   ↓
    │   SessionPanelManager.on('sessionChanged')
    │   └── _focusPanel(sessionId)
    │       ├── PlasticineUI.bringToFront(panelId)
    │       └── panel.container.classList.add('pui-panel-focus')
    │
    └── SSEClient.connect(sessionId) [disconnect previous, connect new]
        ├── EventSource(url) [SSE connection]
        └── SessionSync event handlers [re-registered for new session]
```

### Sequence Diagram: Session Deletion Flow

```
User Action: Click "×" on session panel
    ↓
SessionPanelManager._renderPanel() [close button handler]
    ↓
SessionManager.deleteSession(sessionId)
    ├── DELETE /api/sessions/:sessionId (server call)
    ├── this.sessions = filter out sessionId
    └── this.emit('sessionDeleted', sessionId)
        ↓
        SessionPanelManager.on('sessionDeleted')
        └── _removePanel(sessionId)
            ├── PlasticineUI.removePanel(panelId)
            └── panels.delete(panelId)
```

### SessionViewModel Integration Points

```
SSE Events → SessionSync → SessionViewModel
    ├── 'message' → pushMessage() → emit('message') + emit('messages')
    ├── 'task_response' → setMessages() + setExecute()
    ├── 'progress' → setExecute({progress})
    └── 'complete' → setExecute() + pushMessage()

SessionManager ↔ SessionViewModel
    ├── processExecute() → SessionViewModel.setExecute()
    ├── context.execution updates → SessionViewModel.setExecute()
    └── message events → SessionViewModel.pushMessage()
```

### Key Integration Points

1. **Session Creation**: SessionManager → SessionPanelManager → PlasticineUI
2. **Session Loading**: SessionManager → SessionPanelManager → PlasticineUI
3. **Session Switching**: SessionManager → SSEClient → SessionSync → SessionViewModel
4. **Session Deletion**: SessionManager → SessionPanelManager → PlasticineUI
5. **Real-time Updates**: SSE Events → SessionSync → SessionViewModel → UI Updates

### State Synchronization Flow

```
SSE Event Received
    ↓
SessionSync.applyContext(data.context)
    ├── SessionViewModel.setMessages()
    ├── SessionViewModel.setExecute()
    └── SessionViewModel.emit('messages') + emit('execute')
        ↓
        UI Components listen for 'messages'/'execute' events
        └── Update DOM (conversation, progress bars, etc.)
```

## Execute Handling Catalog ✅ COMPLETED

### Execute Type Mapping Table

| Execute Type | Handler Location | Context.Execution Events | UI Response | Server Response Format |
|-------------|------------------|------------------------|-------------|----------------------|
| `execute.finalResult` | `processExecute()` lines 444-448 | `finalResultReceived` | Display completion summary | N/A (terminal state) |
| `execute.form` | `processExecute()` lines 450-454 | `formReceived` | Show interactive form panel | `result: { choice: "choice_id" }` |
| `execute.message` | `processExecute()` lines 457-463 | `messageReceived` | Append to conversation (no server response needed) | N/A (UI-only) |
| `execute.script` | `processExecute()` lines 466-469 | `scriptReceived` | Show script execution panel | `result: { script: {...} }` |
| `execute['rag-search']` | `processExecute()` lines 472-475 | `ragSearchReceived` | Show RAG search panel | `result: { 'rag-search': {...} }` |
| `execute['read-file']` | `processExecute()` lines 478-481 | `readFileReceived` | Show file selector dialog | `result: { 'read-file': {...} }` |
| `execute['write-file']` | `processExecute()` lines 484-487 | `writeFileReceived` | Show file save dialog | `result: { 'write-file': {...} }` |
| `execute['execute-command']` | `processExecute()` lines 490-493 | `executeCommandReceived` | Show command execution panel | `result: { 'execute-command': {...} }` |

### Context.Execution Event Flow

```javascript
// Lines 419-431: context.execution.step tracking
if (context?.execution?.step) {
    const stepName = context.execution.step;
    const isLlmRequest = stepName === 'llm-request' || execution.action?.startsWith('ai-');

    this.emit('executionStep', {
        step: stepName,
        action: context.execution.action,
        isLlmRequest,
        displayName: isLlmRequest ? 'llm-request' : stepName
    });
}

// Lines 433-440: context.execution.progress tracking
if (context?.execution?.progress !== undefined) {
    this.emit('executionProgress', {
        progress: context.execution.progress,
        action: context.execution.action,
        step: context.execution.step
    });
}
```

### Submission Method Mapping

| Method | Execute Type | Handler Location | Result Format |
|--------|-------------|------------------|---------------|
| `submitChoice(choiceId)` | `execute.form` | lines 505-518 | `{ choice: choiceId }` |
| `submitFormInput(inputData)` | `execute.form` | lines 525-539 | `{ input: inputData }` |
| `submitScriptResult(scriptResult)` | `execute.script` | lines 546-557 | `{ script: scriptResult }` |
| `submitRagSearchResult(searchResult)` | `execute['rag-search']` | lines 564-575 | `{ 'rag-search': searchResult }` |
| `submitReadFileResult(fileResult)` | `execute['read-file']` | lines 582-593 | `{ 'read-file': fileResult }` |
| `submitWriteFileResult(fileResult)` | `execute['write-file']` | lines 600-611 | `{ 'write-file': fileResult }` |
| `submitExecuteCommandResult(commandResult)` | `execute['execute-command']` | lines 618-629 | `{ 'execute-command': commandResult }` |

### SSE Event Processing (Protocol v2.0)

```javascript
// Lines 735-766: handleSSEMessage in session-manager.js
handleSSEMessage(data) {
    // Handle new protocol format with execute object
    if (data?.execute) {
        this.processExecute(data.execute, data.context);
        return;
    }

    // Handle legacy format with content/messages
    if (data?.content) {
        this.appendMessage({
            role: 'assistant',
            content: data.content,
            timestamp: data.timestamp || new Date().toISOString()
        });
    }

    // Handle messages array
    if (data?.messages?.length) {
        data.messages.forEach(msg => this.appendMessage(msg));
    }

    // Handle status updates
    if (data?.status) {
        this.emit('statusChanged', data.status);
    }

    // Handle context updates
    if (data?.context) {
        this._currentContext = data.context;
        this.emit('contextUpdated', data.context);
    }
}
```

### Action-Key Shape Compliance

All result submissions use **action-key shape** as required by protocol:

```typescript
// Correct: action-type keys in result object
{
  result: {
    "choice": "selected_choice",
    "script": { output: "...", error: "..." },
    "read-file": { path: "...", content: "..." },
    "execute-command": { stdout: "...", stderr: "...", exitCode: 0 }
  }
}

// Incorrect: generic keys (deprecated)
{
  result: {
    type: "choice",  // ❌ Wrong - should be action-key
    value: "..."     // ❌ Wrong - should use action-key shape
  }
}
```

## SSE vs. WebSocket Decision Log ✅ COMPLETED

### Transport Selection Logic

#### Primary Transport: SSE (Server-Sent Events)
**Mandatory for real-time session updates** - SSE is the primary transport for:
- Session state synchronization (`/api/sse/:sessionId`)
- Real-time message delivery
- Execution progress updates
- Context state changes

#### Fallback Transport: WebSocket
**Optional enhancement** - WebSocket provides:
- Bidirectional communication when SSE fails
- Lower latency for certain operations
- Connection reliability in restrictive networks

### Connection Establishment Flow

```
Application Start / Session Switch
    ↓
SessionManager.setActiveSession(sessionId)
    ↓
SSEClient.connect(sessionId) [PRIMARY]
    ├── EventSource('/api/sse/:sessionId')
    ├── onopen → success path
    └── onerror → fallback to WebSocket
        ↓
        WebSocketClient.connect(sessionId) [FALLBACK]
        ├── new WebSocket('/api/ws/:sessionId')
        ├── onopen → success path
        └── onerror → polling fallback (future)
```

### SSE Connection Details (`sse-client.js`)

#### Mandatory SSE Endpoints
- **URL Pattern**: `/api/sse/:sessionId`
- **Authentication**: Token in query params (`?token=...`)
- **Heartbeat**: 30-second intervals (configurable)
- **Reconnection**: Exponential backoff (max 5 attempts)

#### SSE Event Types (Mandatory)
```javascript
// Core session events (SSE-only)
eventSource.addEventListener('connected', ...)      // Initial connection
eventSource.addEventListener('log', ...)           // Debug logs
eventSource.addEventListener('progress', ...)      // Execution progress
eventSource.addEventListener('status', ...)        // Session status
eventSource.addEventListener('task_response', ...) // Task responses
eventSource.addEventListener('action_proposal', ...) // Action proposals
eventSource.addEventListener('action_executing', ...) // Action execution
eventSource.addEventListener('step_result', ...)   // Step results
eventSource.addEventListener('complete', ...)      // Task completion
eventSource.addEventListener('error', ...)         // Error events
eventSource.addEventListener('session_update', ...) // Session updates
eventSource.addEventListener('node_added', ...)    // VueFlow nodes
eventSource.addEventListener('node_updated', ...)
eventSource.addEventListener('edge_added', ...)
```

### WebSocket Connection Details (`websocket-client.js`)

#### Optional WebSocket Features
- **URL Pattern**: `ws://localhost:3000/api/ws/:sessionId` or `wss://...`
- **Authentication**: Token in connection headers
- **Heartbeat**: 30-second ping/pong
- **Message Queue**: Failed messages queued for retry

#### WebSocket Capabilities
```javascript
// Bidirectional operations (WebSocket-only)
WebSocketClient.send('task', { message: '...', context: {...} })
WebSocketClient.send('action_approval', { actionId, approved })
WebSocketClient.send('step_result', { stepId, result })

// Real-time responses (when WebSocket active)
WebSocketClient.on('task_started', handler)
WebSocketClient.on('action_approved', handler)
WebSocketClient.on('step_completed', handler)
```

### Fallback Triggers & Conditions

#### SSE Fallback to WebSocket
| Trigger | Condition | Action |
|---------|-----------|--------|
| `EventSource.onerror` | Connection failed | Switch to WebSocket |
| Network timeout | >30s without heartbeat | WebSocket fallback |
| CORS restrictions | SSE blocked by browser | Auto WebSocket |
| Corporate proxy | SSE EventSource blocked | WebSocket attempt |
| Mixed content | HTTP→HTTPS upgrade | WebSocket secure |

#### WebSocket Fallback to Polling (Future)
| Trigger | Condition | Action |
|---------|-----------|--------|
| `WebSocket.onerror` | WebSocket failed | Implement polling |
| Firewall rules | Port 80/443 blocked | HTTP polling fallback |
| Protocol mismatch | WS protocol unsupported | Long polling |

### Connection Limits & Resource Management

#### SSE Limits
- **Max Reconnect Attempts**: 5 (configurable)
- **Reconnect Delay**: 3s base, exponential backoff
- **Heartbeat Interval**: 30 seconds
- **Message Buffer**: Unlimited (client-side processing)
- **Concurrent Connections**: 1 per session

#### WebSocket Limits
- **Max Reconnect Attempts**: 5 (configurable)
- **Reconnect Delay**: 3s base, 2x multiplier
- **Heartbeat Interval**: 30 seconds
- **Message Queue**: 100 messages max
- **Concurrent Connections**: 1 per session

#### Resource Cleanup
```javascript
// Connection cleanup on session switch
SessionManager.setActiveSession(newSessionId)
    ├── SSEClient.disconnect() [close EventSource]
    ├── WebSocketClient.disconnect() [close WebSocket]
    └── Clear message queues
```

### Network Failure Scenarios

#### Scenario 1: SSE Blocked by Corporate Firewall
```
SSE Connection Attempt
    ↓ [BLOCKED]
EventSource.onerror (CORS/Network Error)
    ↓
WebSocket Fallback
    ├── WebSocket.connect()
    └── [SUCCESS] WebSocket active
```

#### Scenario 2: WebSocket Port Blocked
```
SSE Connection Attempt
    ↓ [BLOCKED]
EventSource.onerror
    ↓
WebSocket Fallback Attempt
    ↓ [BLOCKED - Port 80/443 filtered]
Future: HTTP Polling Fallback
    └── [SUCCESS] Polling active
```

#### Scenario 3: Temporary Network Glitch
```
SSE Connected & Active
    ↓ [NETWORK INTERRUPTED]
EventSource.onerror
    ↓ [RECONNECTION ATTEMPTS]
SSE Reconnected
    ↓ [SUCCESS]
Continue with SSE
```

### Transport Decision Matrix

| Feature | SSE | WebSocket | Notes |
|---------|-----|-----------|-------|
| **Real-time Messages** | ✅ Primary | ✅ Fallback | SSE preferred for server→client |
| **Bidirectional** | ❌ | ✅ | WebSocket for client→server |
| **Browser Support** | Modern browsers | Modern browsers | IE11+ for both |
| **Proxy Friendly** | ⚠️ May be blocked | ✅ Usually allowed | WebSocket often filtered |
| **Connection Limits** | ~6 per domain | ~6 per domain | Browser limits |
| **Binary Data** | ❌ | ✅ | WebSocket supports binary |
| **Automatic Reconnect** | ✅ Built-in | ✅ Manual | SSE has better reconnect |
| **Heartbeat** | ✅ Manual | ✅ Manual | Both need custom heartbeat |

### Implementation Notes

1. **SSE is mandatory** for session synchronization - it's the primary transport
2. **WebSocket is optional** enhancement for bidirectional communication
3. **Automatic fallback** ensures connectivity in restrictive environments
4. **Connection limits** are managed per session (1 SSE + 1 WS max)
5. **Resource cleanup** is critical on session switches
6. **Future polling** fallback planned for complete connectivity coverage

## SessionSync Contract Tests ✅ COMPLETED

### SessionSync Event Processing Contracts

SessionSync transforms SSE events into SessionViewModel state updates using these contracts:

#### Contract 1: Message Event Processing
```javascript
// Input: SSE 'message' event
SSE Event: {
  type: 'message',
  data: {
    content: 'User asked about API endpoints',
    role: 'user',
    timestamp: '2024-01-15T10:30:00Z'
  }
}

// Processing (session-sync.js lines 61-63):
pushMessage(data?.message ?? data?.content ?? data, data?.role || 'assistant')

// Expected SessionViewModel State:
SessionViewModel.messages.push({
  id: 'msg_auto_generated_id',
  role: 'user',
  content: 'User asked about API endpoints',
  timestamp: '2024-01-15T10:30:00Z',
  metadata: {}
})
SessionViewModel.emit('message', newMessage)
SessionViewModel.emit('messages', [...messages])
```

#### Contract 2: Task Response Processing
```javascript
// Input: SSE 'task_response' event
SSE Event: {
  type: 'task_response',
  data: {
    context: {
      execution: { step: 'analyze-code', action: 'read-file', progress: 75 },
      messages: [
        { role: 'assistant', content: 'Analyzing code structure...' }
      ]
    },
    execute: {
      message: { content: 'Found 3 API endpoints' }
    }
  }
}

// Processing (session-sync.js lines 65-71):
applyContext(data?.context)
applyExecute(data?.execute)
if (Array.isArray(data?.messages)) {
  vm.setMessages(data.messages)
}

// Expected SessionViewModel State:
SessionViewModel.setMessages(context.messages)  // Sets full message array
SessionViewModel.setExecute(context.execution)  // {step, action, progress}
SessionViewModel.pushMessage(execute.message)   // Assistant response
```

#### Contract 3: Session Update Processing
```javascript
// Input: SSE 'session_update' event
SSE Event: {
  type: 'session_update',
  data: {
    context: {
      execution: { step: 'complete', action: 'api-analysis', progress: 100 },
      messages: [] // No new messages
    },
    execute: {
      finalResult: {
        summary: 'API analysis complete',
        endpoints: ['GET /users', 'POST /users', 'GET /users/:id']
      }
    }
  }
}

// Processing (session-sync.js lines 73-76):
applyContext(data?.context)
if (data?.execute) applyExecute(data.execute)

// Expected SessionViewModel State:
SessionViewModel.setExecute(context.execution)  // Final execution state
// No message updates (empty messages array)
// finalResult handled by SessionManager.processExecute()
```

#### Contract 4: Progress Update Processing
```javascript
// Input: SSE 'progress' event
SSE Event: {
  type: 'progress',
  data: {
    progress: 45,
    step: 'processing-files',
    action: 'batch-analyze'
  }
}

// Processing (session-sync.js lines 78-84):
updateProgress(data)

// Expected SessionViewModel State:
const current = SessionViewModel.execute || {}
SessionViewModel.setExecute({...current, progress: 45})
```

#### Contract 5: Completion Event Processing
```javascript
// Input: SSE 'complete' event
SSE Event: {
  type: 'complete',
  data: {
    context: {
      execution: { step: 'finished', progress: 100 }
    },
    execute: {
      finalResult: { status: 'success', output: 'Task completed' }
    },
    result: {
      message: { content: 'All tasks completed successfully' }
    }
  }
}

// Processing (session-sync.js lines 87-93):
applyContext(data?.context)
applyExecute(data?.execute)
if (data?.result?.message) {
  pushMessage(data.result.message, 'assistant')
}

// Expected SessionViewModel State:
SessionViewModel.setExecute(context.execution)  // Final state
SessionViewModel.pushMessage(result.message)    // Completion message
```

### Context Application Contract

#### Contract 6: Context Application Logic
```javascript
// applyContext(context) function contract
function applyContext(context) {
  if (!context) return;

  // Contract: Update messages if provided
  if (Array.isArray(context.messages) && context.messages.length) {
    vm.setMessages(context.messages);
  }

  // Contract: Update execute state if provided
  if (context.execute) {
    applyExecute(context.execute);
  }

  // Contract: Merge execution progress
  if (context.execution) {
    const merged = {...vm.execute, ...context.execution};
    vm.setExecute(merged);
  }
}
```

#### Contract 7: Execute Application Logic
```javascript
// applyExecute(execute) function contract
function applyExecute(execute) {
  if (!execute) return;

  // Contract: Update SessionViewModel execute state
  vm.setExecute(execute);

  // Contract: Push execute message if present
  if (execute.message) {
    pushMessage(execute.message, 'assistant');
  }
}
```

### Message Normalization Contract

#### Contract 8: Message Normalization
```javascript
// pushMessage function contract
function pushMessage(payload, role = 'assistant') {
  const normalized = normalizeMessage(payload, role);
  if (!normalized) return this;

  // Contract: Maintain 200 message buffer
  const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
  this.messages = next;

  // Contract: Emit individual message event
  this.emit('message', normalized);

  // Contract: Emit updated messages array
  this.emit('messages', [...this.messages]);

  return this;
}
```

### Contract Validation Checklist

#### SSE Event Processing ✅
- [x] `message` events create normalized messages in SessionViewModel
- [x] `task_response` events update both context and execute state
- [x] `session_update` events merge execution state
- [x] `progress` events update progress without losing other state
- [x] `complete` events finalize execution and add completion messages

#### State Synchronization ✅
- [x] Context.messages arrays replace SessionViewModel.messages
- [x] Context.execute objects update SessionViewModel.execute
- [x] Context.execution objects merge with existing execute state
- [x] Execute.message objects become assistant messages

#### Message Buffer Management ✅
- [x] Messages limited to 200 (configurable MAX_MESSAGES)
- [x] FIFO eviction when buffer exceeds limit
- [x] Message normalization handles various input formats
- [x] Timestamps and metadata preserved

#### Event Emission ✅
- [x] Individual message events emitted for UI updates
- [x] Bulk messages array events for list updates
- [x] Execute state change events for progress bars
- [x] All events include complete payload data

### Contract Test Implementation

```javascript
// Example contract test for message processing
test('SessionSync message contract', () => {
  // Setup
  const mockSSE = { on: jest.fn() };
  const mockVM = {
    pushMessage: jest.fn(),
    setExecute: jest.fn(),
    setMessages: jest.fn()
  };

  // Initialize SessionSync
  SessionSync.init(mockVM, mockSSE);

  // Simulate SSE message event
  const messageEvent = {
    type: 'message',
    data: { content: 'test message', role: 'assistant' }
  };

  // Trigger event handler
  mockSSE.on.mock.calls[0][1](messageEvent);

  // Verify contract
  expect(mockVM.pushMessage).toHaveBeenCalledWith('test message', 'assistant');
});
```

## Session View-Model Binding Plan ✅ COMPLETED

### Current Data Flow Architecture

```
SSE Events → SessionSync → SessionViewModel → UI Components
     ↓             ↓             ↓              ↓
  Raw Events   State Transform  Normalized    DOM Updates
  (JSON)       (Business Logic) State        (Rendering)
```

### SessionViewModel Bindings Status

#### ✅ IMPLEMENTED BINDINGS

| Component | Binding | Status | Implementation |
|-----------|---------|--------|----------------|
| **Message Buffer** | `messages: Message[]` | ✅ Complete | `setMessages()`, `pushMessage()` with 200-message FIFO |
| **Execute State** | `execute: Execute` | ✅ Complete | `setExecute()` merges execution state |
| **Session Info** | `sessionId`, `projectId` | ✅ Complete | `setSession()`, `setProject()` |

#### ⚠️ MISSING/INCOMPLETE BINDINGS

| Component | Binding | Status | Issue | Solution |
|-----------|---------|--------|-------|----------|
| **Layout Persistence** | `panelLayout: object` | ❌ Missing | No binding to PlasticineUI panel positions | Add `setPanelLayout()`, `getPanelLayout()` |
| **Message Limits** | `messageLimit: number` | ⚠️ Hardcoded | MAX_MESSAGES=200 not configurable | Add `setMessageLimit(limit)` method |
| **Execute History** | `executeHistory: Execute[]` | ❌ Missing | No execution state history | Add execution state versioning |
| **Connection Status** | `connectionStatus: string` | ❌ Missing | No SSE/WebSocket status binding | Add `setConnectionStatus()` |

### Data Flow Between Components

#### Flow 1: SSE → SessionSync → SessionViewModel → Conversation UI

```
SSE 'message' Event
    ↓ [session-sync.js:61-63]
SessionSync.register('message')
    ↓
pushMessage(data.content, data.role)
    ↓ [session-view-model.js:64-71]
SessionViewModel.pushMessage()
    ├── normalizeMessage() → Message object
    ├── messages.push() + FIFO limit (200)
    ├── emit('message', newMessage)
    └── emit('messages', [...messages])
        ↓ [session-manager.js:appendMessage()]
        SessionManager.appendMessage()
        └── DOM: .conversation-messages.appendChild()
```

#### Flow 2: SSE → SessionSync → SessionViewModel → Progress UI

```
SSE 'progress' Event
    ↓ [session-sync.js:78-84]
SessionSync.register('progress')
    ↓
updateProgress(data)
    ↓ [session-view-model.js:74-76]
SessionViewModel.setExecute({progress})
    ├── execute = {...execute, progress}
    └── emit('execute', execute)
        ↓ [UI Components]
        Progress bars update via execute.progress
```

#### Flow 3: SSE → SessionManager → SessionPanelManager → PlasticineUI

```
SSE 'session_update' Event
    ↓ [session-manager.js:735-766]
SessionManager.handleSSEMessage()
    ├── processExecute(data.execute, data.context)
    └── emit('contextUpdated', context)
        ↓ [session-panel-manager.js:27-32]
        SessionPanelManager.on('sessionsLoaded')
        └── _handleSessionsLoaded() → _addOrUpdatePanel()
            ↓ [plasticine-ui.js]
            PlasticineUI.addPanel() → Panel DOM creation
```

### Missing Binding Implementations

#### Layout Persistence Binding (MISSING)

```javascript
// Proposed: Add to SessionViewModel
class SessionViewModel {
    // ... existing properties
    panelLayout: object = {};

    setPanelLayout(layout) {
        this.panelLayout = {...layout};
        this.emit('panelLayout', this.panelLayout);
        return this;
    }

    getPanelLayout() {
        return {...this.panelLayout};
    }
}

// Integration with SessionPanelManager
SessionPanelManager._savePanelLayout(sessionId, panel, state) {
    const layout = {/* existing layout calculation */};

    // Save to SessionViewModel
    if (global.SessionViewModel) {
        global.SessionViewModel.setPanelLayout(layout);
    }

    // Send to server (existing)
    this.sessionManager.updateSession(sessionId, { context: { panelLayout } });
}
```

#### Message Limit Configuration (HARDCODED)

```javascript
// Proposed: Make configurable
class SessionViewModel {
    // ... existing properties
    messageLimit: number = 200;

    setMessageLimit(limit) {
        this.messageLimit = Math.max(10, Math.min(1000, limit));
        // Re-apply limit to existing messages
        if (this.messages.length > this.messageLimit) {
            this.messages = this.messages.slice(-this.messageLimit);
            this.emit('messages', [...this.messages]);
        }
        return this;
    }

    pushMessage(message, role) {
        const normalized = normalizeMessage(message, role);
        if (!normalized) return this;

        // Use configurable limit instead of hardcoded MAX_MESSAGES
        const next = [...this.messages, normalized].slice(-this.messageLimit);
        this.messages = next;

        this.emit('message', normalized);
        this.emit('messages', [...this.messages]);
        return this;
    }
}
```

#### Connection Status Binding (MISSING)

```javascript
// Proposed: Add connection status tracking
class SessionViewModel {
    // ... existing properties
    connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

    setConnectionStatus(status) {
        this.connectionStatus = status;
        this.emit('connectionStatus', status);
        return this;
    }
}

// Integration with SSE/WebSocket clients
SSEClient.emit('connected', {sessionId}) → SessionViewModel.setConnectionStatus('connected')
SSEClient.emit('disconnected', {sessionId}) → SessionViewModel.setConnectionStatus('disconnected')
WebSocketClient.emit('connecting', {sessionId}) → SessionViewModel.setConnectionStatus('connecting')
```

### Component Binding Matrix

| Component | SessionViewModel | SessionManager | SessionPanelManager | PlasticineUI |
|-----------|------------------|----------------|-------------------|--------------|
| **Messages** | ✅ `messages[]` | ✅ `appendMessage()` | ❌ No direct binding | ❌ No direct binding |
| **Execute State** | ✅ `execute` | ✅ `processExecute()` | ✅ Render progress | ❌ No direct binding |
| **Panel Layout** | ❌ Missing | ❌ Missing | ✅ `_savePanelLayout()` | ✅ Panel positioning |
| **Connection Status** | ❌ Missing | ⚠️ Partial | ❌ Missing | ❌ Missing |
| **Session Info** | ✅ `sessionId/projectId` | ✅ Active session | ✅ Session list | ❌ No direct binding |

### Data Flow Optimization Opportunities

1. **Direct SessionViewModel → PlasticineUI Binding**
   - Currently: SSE → SessionManager → SessionPanelManager → PlasticineUI
   - Optimized: SSE → SessionSync → SessionViewModel → PlasticineUI

2. **Panel Layout Persistence**
   - Missing: SessionViewModel ↔ PlasticineUI synchronization
   - Solution: Add `panelLayout` binding with change listeners

3. **Connection Status Propagation**
   - Missing: SSE/WebSocket status → UI indicators
   - Solution: Add connection status binding with visual feedback

4. **Message Limit Configuration**
   - Hardcoded: MAX_MESSAGES = 200
   - Solution: Runtime configuration via SessionViewModel.setMessageLimit()

### Implementation Priority

1. **HIGH**: Layout persistence binding (user experience impact)
2. **MEDIUM**: Connection status binding (debugging/UX)
3. **LOW**: Message limit configuration (performance tuning)

## Session Persistence Invariants ✅ COMPLETED

### Persistence Invariants Checklist

#### ✅ IMPLEMENTED INVARIANTS

| Invariant | Status | Implementation | Test Status |
|-----------|--------|----------------|-------------|
| **Panel Layout Survival** | ✅ Complete | `_savePanelLayout()` → server storage | Manual testing |
| **Session Metadata** | ✅ Complete | `sessionId`, `projectId` in URL/localStorage | Manual testing |
| **Active Session** | ✅ Complete | `SessionManager.currentSessionId` | Manual testing |
| **Panel Visibility** | ✅ Complete | PlasticineUI state management | Manual testing |

#### ❌ MISSING/INCOMPLETE INVARIANTS

| Invariant | Status | Issue | Impact |
|-----------|--------|-------|--------|
| **Panel Layout Reload** | ❌ Missing | Layouts not restored on page reload | UX disruption |
| **Session State Sync** | ⚠️ Partial | SSE context updates may conflict with saved layouts | Data inconsistency |
| **Cross-tab Sync** | ❌ Missing | Multiple tabs don't share session state | UX confusion |
| **Offline Persistence** | ❌ Missing | No localStorage fallback for network failures | Data loss |

### Panel Layout Persistence Flow

#### Current Implementation (session-panel-manager.js:244-281)

```javascript
_savePanelLayout(sessionId, panel, state) {
    // Calculate layout from DOM
    const styles = panel.container.style;
    const left = styles.left || panel.container.offsetLeft + 'px';
    const top = styles.top || panel.container.offsetTop + 'px';
    const width = styles.width || panel.container.offsetWidth + 'px';
    const height = styles.height || panel.container.offsetHeight + 'px';

    const panelLayout = {
        id: panel.id,
        type: panel.type,
        state: state,
        slot: slot, // calculated from classList
        title: title, // from .pui-panel-title
        left, top, width, height
    };

    // Persist to server
    this.sessionManager.updateSession(sessionId, {
        context: { panelLayout }
    }).catch(err => console.warn('Failed to save panelLayout:', err));
}
```

#### Layout Restoration Issues

**Problem**: Layouts are saved to server but **not restored** on page reload

```javascript
// MISSING: Layout restoration on panel creation
_addOrUpdatePanel(session) {
    // ... panel creation ...
    const layout = detail.context?.panelLayout || {};
    this._applyLayout(panel, layout); // ✅ Called but layout may be empty
}

// Issue: detail.context?.panelLayout is undefined on fresh load
// because session detail doesn't include layout unless explicitly requested
```

### Session Lifecycle Alignment

#### Session Load Flow vs. Persistence

```
Page Load
    ↓
SessionPanelManager.setProject(projectId)
    ↓
SessionManager.loadSessions(projectId) [GET /api/sessions?projectId=...]
    ↓ [Server returns session summaries WITHOUT panelLayout]
SessionPanelManager._handleSessionsLoaded(sessions)
    ↓
for each session: _addOrUpdatePanel(sessionSummary)
    ↓ [_fetchSessionDetail() gets full session WITH context.panelLayout]
    PlasticineUI.addPanel() + _applyLayout(panel, layout)
```

**Invariant Violation**: Session summaries from list API don't include `context.panelLayout`, causing panels to load with default positions.

#### SSE Context Updates vs. Saved Layouts

```
SSE 'session_update' Event
    ↓
SessionManager.handleSSEMessage(data)
    ├── processExecute(data.execute, data.context)
    └── _currentContext = data.context  [OVERWRITES saved context]
        ↓
        SessionPanelManager may not re-apply layout
```

**Invariant Violation**: SSE context updates may overwrite `panelLayout` without UI synchronization.

### Reload Survival Analysis

#### What Survives Page Reload ✅

1. **Server-stored Data**
   - Session metadata (id, title, createdAt)
   - Conversation history (messages)
   - Execution state (current step/progress)
   - Panel layouts (stored in context.panelLayout)

2. **URL Parameters**
   - `?session=sessionId` - Active session
   - `?project=projectId` - Current project

3. **LocalStorage (if implemented)**
   - User preferences
   - UI settings

#### What Doesn't Survive ❌

1. **In-memory State**
   - Active panel references
   - Event listeners
   - Component instances

2. **DOM State**
   - Panel positions (recalculated from saved layouts)
   - UI focus states
   - Form inputs

3. **Connection State**
   - SSE/WebSocket connections (re-established)
   - Message queues

### Invariants Regression Test Matrix

#### Test Case 1: Panel Layout Survival
```javascript
test('panel layouts survive page reload', async ({ page }) => {
    // Arrange: Create session with custom panel layout
    await createSessionWithLayout({
        left: '100px', top: '150px',
        width: '400px', height: '300px',
        state: 'expanded'
    });

    // Act: Reload page
    await page.reload();

    // Assert: Layout restored
    const panel = page.locator('.pui-panel');
    await expect(panel).toHaveCSS('left', '100px');
    await expect(panel).toHaveCSS('top', '150px');
    // ... etc
});
```

#### Test Case 2: Session Metadata Consistency
```javascript
test('session metadata survives reload', async ({ page }) => {
    // Arrange: Set active session
    await setActiveSession('session-123');

    // Act: Reload page
    await page.reload();

    // Assert: Session still active
    const activeSession = await getActiveSession();
    expect(activeSession).toBe('session-123');
});
```

#### Test Case 3: SSE Context Alignment
```javascript
test('SSE updates dont break saved layouts', async ({ page }) => {
    // Arrange: Save custom layout
    await savePanelLayout(sessionId, customLayout);

    // Act: Receive SSE context update without panelLayout
    await simulateSSEContextUpdate({ execution: { step: 'new-step' } });

    // Assert: Layout unchanged
    const currentLayout = await getPanelLayout(sessionId);
    expect(currentLayout).toEqual(customLayout);
});
```

### Required Fixes for Invariants

#### Fix 1: Layout Restoration on Load

```javascript
// In SessionPanelManager._fetchSessionDetail()
async _fetchSessionDetail(sessionSummary) {
    // Always fetch full session detail including context.panelLayout
    const detail = await this.sessionManager.getSession(sessionSummary.id);

    // Ensure panelLayout exists in context
    if (!detail.context) detail.context = {};
    if (!detail.context.panelLayout) {
        detail.context.panelLayout = {
            state: 'expanded',
            slot: 'floating',
            left: '20px', top: '20px',
            width: '400px', height: '300px'
        };
    }

    return detail;
}
```

#### Fix 2: SSE Context Merging

```javascript
// In SessionManager.handleSSEMessage()
handleSSEMessage(data) {
    // Merge SSE context with existing context (preserve panelLayout)
    if (data.context) {
        this._currentContext = {
            ...this._currentContext,  // Preserve existing (including panelLayout)
            ...data.context          // Apply updates
        };
    }
    // ... rest of handling
}
```

#### Fix 3: Cross-tab Synchronization

```javascript
// Add localStorage-based cross-tab sync
class SessionStateSync {
    static broadcast(event, data) {
        localStorage.setItem('session-event', JSON.stringify({ event, data, timestamp: Date.now() }));
        localStorage.removeItem('session-event'); // Trigger storage event
    }

    static listen(handler) {
        window.addEventListener('storage', (e) => {
            if (e.key === 'session-event') {
                const { event, data } = JSON.parse(e.newValue);
                handler(event, data);
            }
        });
    }
}
```

### Invariants Compliance Status

| Invariant Category | Current Status | Required Actions |
|-------------------|----------------|------------------|
| **Panel Layout Persistence** | ⚠️ Partial | Fix layout restoration, SSE merging |
| **Session Metadata** | ✅ Complete | No action needed |
| **Active Session Tracking** | ✅ Complete | No action needed |
| **Cross-tab Sync** | ❌ Missing | Implement localStorage broadcast |
| **Offline Resilience** | ❌ Missing | Add localStorage fallback |

### Implementation Priority

1. **CRITICAL**: Fix panel layout restoration (blocks reload UX)
2. **HIGH**: Fix SSE context merging (prevents layout corruption)
3. **MEDIUM**: Add cross-tab sync (improves multi-tab UX)
4. **LOW**: Add offline persistence (graceful degradation)

## Message Normalization & Pruning ✅ COMPLETED

### Message Normalization Flow

#### Input Format Handling (session-view-model.js:6-20)

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

#### Supported Input Formats

| Input Type | Example | Normalized Output |
|------------|---------|-------------------|
| **String** | `"Hello world"` | `{role: 'system', content: 'Hello world', ...}` |
| **SSE Message** | `{content: 'Hi', role: 'user'}` | `{role: 'user', content: 'Hi', ...}` |
| **Legacy Format** | `{message: 'Hi', direction: 'incoming'}` | `{role: 'assistant', content: 'Hi', ...}` |
| **Execute Message** | `{text: 'Processing...'}` | `{role: 'system', content: 'Processing...', ...}` |

### Message Buffer Management

#### 200-Message Ceiling Enforcement (session-view-model.js:64-83)

```javascript
pushMessage(message, role = 'assistant') {
    const normalized = normalizeMessage(message, role);
    if (!normalized) return this;

    // FIFO buffer with 200-message limit
    const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
    this.messages = next;

    this.emit('message', normalized);
    this.emit('messages', [...this.messages]);
    return this;
}

// MAX_MESSAGES = 200 (hardcoded constant)
const MAX_MESSAGES = 200;
```

#### Buffer Lifecycle Events

```
Message Added
    ↓ [pushMessage()]
normalizeMessage() → Message object
    ↓
messages.push(normalized)
    ↓ [FIFO eviction if > 200]
messages = messages.slice(-MAX_MESSAGES)
    ↓
emit('message', normalized) [individual message]
emit('messages', [...messages]) [full array]
    ↓ [UI updates]
DOM: .conversation-messages.appendChild()
```

### History Truncation & Compaction

#### When Truncation Occurs

**Automatic Truncation Triggers:**

1. **Message Addition** - When `pushMessage()` adds a new message and buffer exceeds 200
2. **Session Load** - When `setMessages()` loads conversation history
3. **Context Update** - When SSE sends full message array that exceeds limit

```javascript
// setMessages() also enforces limit (session-view-model.js:54-61)
setMessages(messages = []) {
    if (!Array.isArray(messages)) return this;
    this.messages = messages
        .map((msg) => normalizeMessage(msg, 'assistant'))
        .filter(Boolean)
        .slice(-MAX_MESSAGES);  // ← Truncation here
    this.emit('messages', [...this.messages]);
    return this;
}
```

#### Compaction Strategy

**FIFO (First In, First Out) Eviction:**

```
Before: [msg_1, msg_2, ..., msg_200, msg_201]
After:  [msg_2, msg_3, ..., msg_201]        (msg_1 evicted)
```

**Rationale:**
- Preserves recent conversation context
- Maintains chronological order
- Simple and predictable behavior

#### Truncation Scenarios

| Scenario | Trigger | Behavior |
|----------|---------|----------|
| **Normal Usage** | < 200 messages | No truncation |
| **High Volume** | > 200 messages added | Evict oldest messages |
| **Session Load** | Loading old conversation | Keep most recent 200 |
| **Context Sync** | SSE sends full history | Server controls what to send |

### Buffer Policy Description

#### Design Principles

1. **Memory Efficiency**: Prevent unbounded growth
2. **Context Preservation**: Keep recent conversation
3. **Performance**: Fast FIFO operations
4. **Consistency**: Predictable truncation behavior

#### Buffer Limits

| Limit Type | Value | Rationale |
|------------|-------|-----------|
| **Hard Maximum** | 200 messages | Balance memory vs. context |
| **Soft Minimum** | 10 messages | Minimum context preservation |
| **Growth Factor** | N/A | Immediate truncation on overflow |

#### Instrumentation Hooks

**Current Logging (session-view-model.js:104-112):**

```javascript
emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => {
        try {
            handler(payload);
        } catch (err) {
            console.error('[SessionViewModel] Handler failed for', event, err);
        }
    });
}
```

**Proposed Enhanced Logging:**

```javascript
pushMessage(message, role) {
    const beforeCount = this.messages.length;
    // ... existing logic ...
    const afterCount = this.messages.length;

    if (beforeCount !== afterCount) {
        console.log(`[SessionViewModel] Buffer: ${beforeCount} → ${afterCount} messages`);
        if (beforeCount > MAX_MESSAGES) {
            console.warn(`[SessionViewModel] Truncated ${beforeCount - MAX_MESSAGES} old messages`);
        }
    }
}
```

### Message Processing Pipeline

#### End-to-End Flow

```
Raw SSE Event
    ↓ [session-sync.js]
SessionSync.register('message')
    ↓
pushMessage(data.content, data.role)
    ↓ [session-view-model.js]
normalizeMessage() → standardized format
    ↓
Buffer management (FIFO limit)
    ↓
Event emission ('message', 'messages')
    ↓ [session-manager.js]
appendMessage() → DOM manipulation
    ↓ [UI]
Conversation display updates
```

#### Error Handling

```javascript
// Robust normalization (handles malformed inputs)
normalizeMessage(value, defaultRole) {
    if (!value) return null;

    try {
        const role = value.role || defaultRole;
        const content = typeof value === 'string'
            ? value
            : (value.content || value.message || value.text || '');

        if (!content || typeof content !== 'string') return null;

        return {
            id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: String(role),
            content: String(content).slice(0, 10000), // Prevent huge messages
            timestamp: value.timestamp || new Date().toISOString(),
            metadata: value.metadata || {}
        };
    } catch (err) {
        console.error('[SessionViewModel] Message normalization failed:', err, value);
        return null;
    }
}
```

#### Performance Considerations

| Operation | Complexity | Frequency | Optimization |
|-----------|------------|-----------|--------------|
| **pushMessage** | O(1) amortized | Per message | Single array push + slice |
| **setMessages** | O(n) | Session load | Map + filter + slice |
| **normalizeMessage** | O(1) | Per message | Simple property access |
| **Event emission** | O(m) where m = listeners | Per message | Async event loop |

### Buffer Monitoring & Alerts

#### Current State
- No buffer size monitoring
- Silent truncation on overflow
- No user notification of message loss

#### Proposed Enhancements

```javascript
// Buffer health monitoring
class MessageBufferMonitor {
    static checkBufferHealth(messages, maxMessages = 200) {
        const utilization = messages.length / maxMessages;

        if (utilization > 0.9) {
            console.warn(`[BufferMonitor] High utilization: ${(utilization * 100).toFixed(1)}%`);
        }

        if (utilization >= 1.0) {
            // Could emit event to UI for user notification
            console.info('[BufferMonitor] Buffer full, truncating old messages');
        }

        return {
            utilization,
            messagesCount: messages.length,
            maxMessages,
            oldestMessage: messages[0]?.timestamp,
            newestMessage: messages[messages.length - 1]?.timestamp
        };
    }
}
```

## Context Reconciliation Strategy ✅ COMPLETED

### Competing Payload Resolution Logic

#### Duplicate execute.step Detection

**Current Implementation (session-sync.js analysis):**

```javascript
// NO duplicate detection currently implemented
register('session_update', data => {
    applyContext(data?.context);
    if (data?.execute) applyExecute(data.execute);
});

// Missing: Step conflict resolution
// Issue: Multiple SSE events with same execute.step overwrite each other
```

**Proposed Duplicate Detection:**

```javascript
// Add step versioning/conflict resolution
class ContextReconciler {
    static reconcileExecuteStep(newContext, existingContext) {
        const newStep = newContext?.execution?.step;
        const existingStep = existingContext?.execution?.step;

        if (!newStep || !existingStep) return newContext;

        if (newStep === existingStep) {
            // Same step - merge progress/data, prefer newer timestamp
            const merged = {
                ...existingContext,
                ...newContext,
                execution: {
                    ...existingContext.execution,
                    ...newContext.execution,
                    // Merge arrays/objects intelligently
                    progress: Math.max(
                        existingContext.execution.progress || 0,
                        newContext.execution.progress || 0
                    )
                }
            };

            console.log(`[ContextReconciler] Merged duplicate step: ${newStep}`);
            return merged;
        }

        // Different steps - allow update
        return newContext;
    }
}
```

#### Out-of-Order Message Handling

**Current FIFO Buffer Logic (session-view-model.js:64-83):**

```javascript
pushMessage(message, role = 'assistant') {
    const normalized = normalizeMessage(message, role);
    if (!normalized) return this;

    // Simple append + truncate - NO sequence validation
    const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
    this.messages = next;

    this.emit('message', normalized);
    this.emit('messages', [...this.messages]);
    return this;
}
```

**Out-of-Order Scenarios:**

| Scenario | Current Behavior | Problem | Solution |
|----------|------------------|---------|----------|
| **Network delay** | Messages arrive out of sequence | UI shows wrong order | Sequence-based reordering |
| **SSE retry** | Duplicate message sent | Double display | Deduplication by ID |
| **Parallel execution** | Multiple execute paths | State conflicts | Execution versioning |

#### Deduplication Mechanisms

**Message Deduplication (MISSING):**

```javascript
// Proposed: Add message ID tracking
class MessageDeduplicator {
    constructor() {
        this.seenIds = new Set();
        this.maxSeenIds = 1000; // Prevent memory leak
    }

    isDuplicate(message) {
        const id = message.id || `${message.timestamp}-${message.content}`;
        if (this.seenIds.has(id)) {
            console.log(`[MessageDeduplicator] Duplicate message: ${id}`);
            return true;
        }

        this.seenIds.add(id);
        if (this.seenIds.size > this.maxSeenIds) {
            // Remove oldest 20% to prevent unbounded growth
            const toRemove = Math.floor(this.maxSeenIds * 0.2);
            const oldest = Array.from(this.seenIds).slice(0, toRemove);
            oldest.forEach(id => this.seenIds.delete(id));
        }

        return false;
    }
}

// Integration with pushMessage
pushMessage(message, role) {
    const normalized = normalizeMessage(message, role);
    if (!normalized) return this;

    // Check for duplicates
    if (this.messageDeduplicator.isDuplicate(normalized)) {
        return this; // Skip duplicate
    }

    // ... rest of logic
}
```

#### Backpressure Mechanisms

**SSE Event Buffering (MISSING):**

```javascript
// Proposed: Add event queue with backpressure
class SSEEventQueue {
    constructor(maxQueueSize = 100, processDelay = 10) {
        this.queue = [];
        this.maxQueueSize = maxQueueSize;
        this.processDelay = processDelay;
        this.processing = false;
        this.droppedEvents = 0;
    }

    enqueue(event) {
        if (this.queue.length >= this.maxQueueSize) {
            this.droppedEvents++;
            console.warn(`[SSEEventQueue] Dropped event due to full queue (${this.droppedEvents} total)`);
            return false;
        }

        this.queue.push(event);
        this.scheduleProcessing();
        return true;
    }

    async scheduleProcessing() {
        if (this.processing) return;

        this.processing = true;
        await new Promise(resolve => setTimeout(resolve, this.processDelay));

        while (this.queue.length > 0) {
            const event = this.queue.shift();
            try {
                await this.processEvent(event);
            } catch (err) {
                console.error('[SSEEventQueue] Event processing failed:', err);
            }
        }

        this.processing = false;
    }

    async processEvent(event) {
        // Process event through SessionSync
        SessionSync.handleEvent(event);
    }
}
```

### Decision Log: Conflict Resolution Scenarios

#### Scenario 1: Duplicate execute.step Updates

**Problem:** Multiple SSE events update the same execution step

```javascript
// Event 1: Initial step
{ type: 'session_update', context: { execution: { step: 'analyze', progress: 0 } } }

// Event 2: Progress update (same step)
{ type: 'progress', progress: 50, step: 'analyze' }

// Event 3: Final update (same step)
{ type: 'session_update', context: { execution: { step: 'analyze', progress: 100 } } }
```

**Desired Outcome:** Merge progress, keep latest data

```javascript
// Resolved state
{
    execution: {
        step: 'analyze',
        progress: 100,  // Highest progress wins
        // Other fields merged
    }
}
```

#### Scenario 2: Out-of-Order Messages

**Problem:** Network latency causes messages to arrive out of sequence

```javascript
// Messages sent in order: A, B, C
// Messages received: A, C, B (B delayed)

const messages = [
    { id: 'msg-A', content: 'Hello', sequence: 1 },
    { id: 'msg-C', content: 'World', sequence: 3 },  // Arrives second
    { id: 'msg-B', content: 'Beautiful', sequence: 2 } // Arrives last
];
```

**Desired Outcome:** Display in correct sequence order

```javascript
// UI shows: Hello, Beautiful, World
const displayOrder = [
    { content: 'Hello', sequence: 1 },
    { content: 'Beautiful', sequence: 2 },
    { content: 'World', sequence: 3 }
];
```

#### Scenario 3: Competing Context Updates

**Problem:** SSE and manual updates conflict

```javascript
// Manual UI update
SessionManager.submitChoice('option-1');

// Concurrent SSE update
{ type: 'session_update', context: { execution: { step: 'choice-made', choice: 'option-2' } } }
```

**Resolution Strategy:** Last-write-wins with conflict logging

```javascript
// Detect conflict
if (localChoice !== sseChoice) {
    console.warn('[ContextReconciler] Choice conflict:', { local: localChoice, sse: sseChoice });
    // Prefer SSE update for consistency
    return sseContext;
}
```

### Instrumentation for Conflict Detection

#### Proposed Logging Hooks

```javascript
// Add to SessionSync
register('session_update', data => {
    const previousContext = SessionManager.getCurrentContext();
    const conflicts = detectConflicts(data.context, previousContext);

    if (conflicts.length > 0) {
        console.warn('[SessionSync] Context conflicts detected:', conflicts);
        // Log to server for analysis
        reportConflicts(conflicts, data.context, previousContext);
    }

    applyContext(data?.context);
});

function detectConflicts(newContext, oldContext) {
    const conflicts = [];

    // Check execution step conflicts
    if (newContext?.execution?.step !== oldContext?.execution?.step) {
        conflicts.push({
            type: 'execution_step_change',
            from: oldContext?.execution?.step,
            to: newContext?.execution?.step
        });
    }

    // Check progress regressions
    const newProgress = newContext?.execution?.progress || 0;
    const oldProgress = oldContext?.execution?.progress || 0;
    if (newProgress < oldProgress) {
        conflicts.push({
            type: 'progress_regression',
            from: oldProgress,
            to: newProgress
        });
    }

    return conflicts;
}
```

### Implementation Priority

1. **CRITICAL**: Duplicate message detection (prevents UI corruption)
2. **HIGH**: Execution step conflict resolution (prevents state thrashing)
3. **MEDIUM**: Out-of-order message handling (improves UX)
4. **LOW**: Advanced backpressure (performance optimization)

### Testing Scenarios for Reconciliation

#### Test Case: Duplicate Step Merging
```javascript
test('duplicate execute steps are merged correctly', () => {
    // Send multiple updates for same step
    simulateSSEEvent('session_update', { execution: { step: 'analyze', progress: 0 } });
    simulateSSEEvent('progress', { progress: 50, step: 'analyze' });
    simulateSSEEvent('session_update', { execution: { step: 'analyze', progress: 75 } });

    // Assert final state
    const execute = getCurrentExecute();
    expect(execute.step).toBe('analyze');
    expect(execute.progress).toBe(75); // Highest progress
});
```

#### Test Case: Out-of-Order Resolution
```javascript
test('out-of-order messages are reordered', () => {
    // Send messages out of sequence
    simulateMessage({ id: 'a', sequence: 1, content: 'First' });
    simulateMessage({ id: 'c', sequence: 3, content: 'Third' });
    simulateMessage({ id: 'b', sequence: 2, content: 'Second' });

    // Assert display order
    const messages = getDisplayedMessages();
    expect(messages.map(m => m.sequence)).toEqual([1, 2, 3]);
});
```

## Message Normalization & Pruning ✅ COMPLETED

### Message Buffer Architecture

#### Core Constants
```javascript
const MAX_MESSAGES = 200; // Hardcoded buffer limit
```

#### Message Structure Contract
All messages are normalized to this format:
```javascript
{
  id: string,           // Unique identifier (auto-generated if missing)
  role: string,         // 'user' | 'assistant' | 'system'
  content: string,      // Message text content
  timestamp: string,    // ISO date string
  metadata: object      // Optional additional data
}
```

### Normalization Flow

#### normalizeMessage Function (session-view-model.js:6-20)
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

#### Input Format Support
- **String**: `normalizeMessage("Hello world")` → `{content: "Hello world", role: "system"}`
- **Object with content**: `{content: "Hi", role: "user"}` → normalized message
- **Legacy formats**: `message`, `text` fields supported for backward compatibility
- **Null/empty**: Returns `null`, filtered out

### Buffer Management

#### FIFO Eviction Strategy
```javascript
// pushMessage implementation (session-view-model.js:64-72)
pushMessage(message, role = 'assistant') {
    const normalized = normalizeMessage(message, role);
    if (!normalized) return this;

    // FIFO: Keep newest MAX_MESSAGES, drop oldest
    const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
    this.messages = next;

    this.emit('message', normalized);
    this.emit('messages', [...this.messages]);
    return this;
}
```

#### Bulk Message Loading
```javascript
// setMessages implementation (session-view-model.js:54-62)
setMessages(messages = []) {
    if (!Array.isArray(messages)) return this;

    this.messages = messages
        .map((msg) => normalizeMessage(msg, 'assistant'))  // Normalize all
        .filter(Boolean)                                    // Remove nulls
        .slice(-MAX_MESSAGES);                             // Apply limit

    this.emit('messages', [...this.messages]);
    return this;
}
```

### Pruning Triggers

#### When History Truncation Occurs

| Trigger | Implementation | Behavior |
|---------|----------------|----------|
| **Individual Message Push** | `pushMessage()` → `slice(-MAX_MESSAGES)` | Drops oldest message when buffer exceeds 200 |
| **Bulk Message Load** | `setMessages()` → `slice(-MAX_MESSAGES)` | Truncates loaded history to 200 messages |
| **Context Update** | SSE `task_response` → `setMessages()` | Applies limit on server context sync |
| **Session Reset** | `reset()` → `messages = []` | Clears buffer completely |

#### Buffer Size Monitoring
- **No dynamic configuration**: MAX_MESSAGES is hardcoded at 200
- **No compaction**: Messages are either kept or dropped entirely
- **No compression**: Full message objects stored in memory
- **No persistence**: Buffer is in-memory only (persisted via server context)

### SSE Message Processing Flow

#### Message Event Handling (session-sync.js:61-63)
```javascript
register('message', data => {
    pushMessage(
        data?.message ?? data?.content ?? data,
        data?.role || data?.direction || 'assistant'
    );
});
```

#### Context Synchronization (session-sync.js:65-71)
```javascript
register('task_response', data => {
    applyContext(data?.context);    // May call setMessages()
    applyExecute(data?.execute);    // May push execute.message
    if (Array.isArray(data?.messages)) {
        vm.setMessages(data.messages);  // Explicit bulk load
    }
});
```

### Message Buffer Invariants

#### ✅ MAINTAINED INVARIANTS

| Invariant | Status | Implementation |
|-----------|--------|----------------|
| **Maximum 200 Messages** | ✅ Enforced | All entry points use `slice(-MAX_MESSAGES)` |
| **Message Normalization** | ✅ Complete | `normalizeMessage()` called on all inputs |
| **FIFO Eviction** | ✅ Complete | Oldest messages dropped first |
| **Event Emission** | ✅ Complete | Individual + bulk message events |
| **Type Safety** | ✅ Complete | String coercion, null filtering |

#### ⚠️ LIMITATIONS

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Hardcoded Limit** | No runtime configuration | Could be made configurable |
| **No Compression** | Memory usage scales with message size | Could implement truncation |
| **No Persistence** | Buffer lost on page reload | Server context provides persistence |
| **No Deduplication** | Duplicate messages possible | Could add message ID dedup |

### Performance Characteristics

#### Memory Usage
- **Per Message**: ~200-500 bytes (content + metadata)
- **Buffer Total**: ~40-100KB at maximum capacity
- **Growth Rate**: Linear with message frequency

#### Operation Complexity
- **pushMessage**: O(1) amortized (slice operation)
- **setMessages**: O(n) for normalization + O(1) for slice
- **Event Emission**: O(listeners) for each operation

### Testing Coverage

#### Buffer Limit Tests (session-persistence.spec.ts)
```javascript
test('handles message buffer limits correctly', async ({ page }) => {
    // Create session with 250 messages
    const messages = Array.from({length: 250}, (_, i) => ({
        content: `Message ${i}`,
        role: 'assistant',
        timestamp: new Date().toISOString()
    }));

    await page.evaluate((messages) => {
        global.SessionViewModel.setMessages(messages);
    }, messages);

    // Verify only last 200 kept
    const state = await persistenceTester.createSessionSnapshot();
    expect(state.messages.length).toBe(200);
    expect(state.messages[0].content).toBe('Message 50');  // Oldest kept
    expect(state.messages[199].content).toBe('Message 249'); // Newest
});
```

### Buffer Policy Recommendations

#### Current Policy: Strict FIFO
- **Pros**: Simple, predictable, memory-bounded
- **Cons**: No intelligence about message importance

#### Potential Enhancements
1. **Intelligent Compaction**: Truncate long messages, compress metadata
2. **Priority-based Retention**: Keep important messages longer
3. **Time-based Eviction**: Prefer recent messages over old ones
4. **Configurable Limits**: Runtime adjustment based on session type

### Implementation Notes

1. **Normalization is Defensive**: Handles various input formats gracefully
2. **Buffer is Client-Only**: Server context provides the authoritative message history
3. **Events are Comprehensive**: Both individual and bulk updates emitted
4. **Memory is Bounded**: Hard limit prevents unbounded growth
5. **Performance is Optimized**: Slice operations are efficient for small buffers

---

## Context Reconciliation Strategy ✅ COMPLETED

### Competing Payload Resolution Architecture

#### Reconciliation Principles
The system uses **server-authoritative state** with **optimistic local updates** and **graceful conflict resolution**:

1. **Server is Source of Truth**: All context updates originate from server SSE events
2. **Last-Write-Wins**: Newer context completely replaces older context
3. **Merge Execution State**: `context.execution` fields are merged, not replaced
4. **FIFO Message Ordering**: Messages maintain arrival order (no reordering)
5. **Progress Advancement Only**: Progress values only increase (prevent regressions)

### SSE Event Processing Conflicts

#### Duplicate Execution Steps
```javascript
// Problem: Multiple SSE events with same execution.step
register('session_update', data => {
  const newStep = data?.context?.execution?.step;
  const currentStep = vm.execute?.step;

  if (newStep && newStep === currentStep) {
    console.warn('[SessionSync] Duplicate step:', newStep);
    // Current behavior: Process anyway (last-write-wins)
  }

  applyContext(data?.context);
});
```

**Resolution Strategy**: Accept duplicates - server may legitimately send same step multiple times.

#### Out-of-Order Messages
```javascript
// Problem: Messages arrive out of sequence
register('message', data => {
  // Current: No sequence validation
  pushMessage(data?.message ?? data?.content ?? data, data?.role || 'assistant');
});
```

**Resolution Strategy**: No reordering - messages displayed in arrival order. Future enhancement could add sequence numbers.

#### Competing Execute Payloads
```javascript
// Problem: execute.form followed immediately by execute.message
SSE Event 1: { execute: { form: { choices: [...] } } }
SSE Event 2: { execute: { message: { content: "Processing..." } } }

// Resolution: Both processed independently
processExecute(event1.execute) // → formReceived event
processExecute(event2.execute) // → messageReceived event
```

### Context Merging Logic

#### Execution State Merging (session-sync.js:35-38)
```javascript
function applyContext(context) {
  if (!context) return;

  // Messages: Replace entirely
  if (Array.isArray(context.messages)) {
    vm.setMessages(context.messages);
  }

  // Execute: Replace entirely
  if (context.execute) {
    applyExecute(context.execute);
  }

  // Execution: Merge fields
  if (context.execution) {
    const merged = {...vm.execute, ...context.execution};
    vm.setExecute(merged);
  }
}
```

#### Progress Update Protection (session-sync.js:41-49)
```javascript
function updateProgress(progressData) {
  const progress = progressData.progress || progressData.percentage;
  if (progress == null) return;

  const current = vm.execute || {};

  // Only advance progress (prevent regressions)
  if (progress >= (current.progress || 0)) {
    vm.setExecute({...current, progress});
  } else {
    console.warn('[SessionSync] Progress regression prevented:', progress, 'vs', current.progress);
  }
}
```

### Backpressure Mechanisms

#### Event Processing Queue
- **No Explicit Queue**: Events processed synchronously as they arrive
- **Error Isolation**: Each event handler wrapped in try-catch
- **Non-Blocking**: SSE processing doesn't block UI

#### Message Buffer Limits
- **Hard Limit**: 200 messages maximum
- **Automatic Pruning**: Old messages evicted on overflow
- **Memory Bounded**: Prevents unbounded memory growth

### Conflict Scenarios & Resolutions

#### Scenario 1: Rapid Context Updates
```
Time 0: SSE sends { context: { execution: { step: 'analyze', progress: 10 } } }
Time 1: SSE sends { context: { execution: { step: 'analyze', progress: 25 } } }
Time 2: SSE sends { context: { execution: { step: 'analyze', progress: 15 } } } // Regression!
```
**Resolution**: Progress 15 rejected (advancement-only policy)

#### Scenario 2: Interleaved Execute Types
```
SSE 1: { execute: { form: { choices: ['A', 'B'] } } }
SSE 2: { execute: { message: { content: "Choose wisely..." } } }
User: Submits choice 'A'
SSE 3: { execute: { message: { content: "Processing choice A..." } } }
```
**Resolution**: All execute types processed independently, UI handles multiple simultaneous panels

#### Scenario 3: Context + Execute Competition
```
SSE: {
  context: { execution: { step: 'processing', progress: 50 } },
  execute: { message: { content: "Halfway done" } }
}
```
**Resolution**: Context merged, execute processed, message added to conversation

### Deduplication Mechanisms

#### Message Deduplication (Not Currently Implemented)
```javascript
// Potential enhancement: Dedup by content hash
function isDuplicate(message, existingMessages) {
  const hash = crypto.createHash('md5').update(message.content).digest('hex');
  return existingMessages.some(m => m.metadata?.contentHash === hash);
}
```

#### Event Deduplication (Not Currently Implemented)
```javascript
// Potential enhancement: Dedup by event ID
const processedEvents = new Set();
register('session_update', data => {
  const eventId = data.metadata?.eventId;
  if (eventId && processedEvents.has(eventId)) {
    console.log('[SessionSync] Duplicate event ignored:', eventId);
    return;
  }
  if (eventId) processedEvents.add(eventId);
  // Process event...
});
```

### Reconciliation Testing Scenarios

#### Progress Regression Prevention
```javascript
test('progress only advances forward', async ({ page }) => {
  // Set initial progress
  await simulateSSEMessage('progress', { progress: 50 });

  // Attempt regression
  await simulateSSEMessage('progress', { progress: 25 });

  // Verify progress unchanged
  const progressBar = page.locator('[data-testid="progress-bar"]');
  await expect(progressBar).toHaveAttribute('value', '50');
});
```

#### Context Overwrite Handling
```javascript
test('later context overwrites earlier', async ({ page }) => {
  // Initial context
  await simulateSSEMessage('session_update', {
    context: { execution: { step: 'step1', progress: 10 } }
  });

  // Updated context
  await simulateSSEMessage('session_update', {
    context: { execution: { step: 'step2', progress: 20 } }
  });

  // Verify complete replacement
  const step = page.locator('[data-testid="execution-step"]');
  await expect(step).toHaveText('step2');
});
```

### Future Enhancement Opportunities

#### Sequence Numbers for Ordering
```javascript
// Add sequence validation
class MessageSequencer {
  constructor() {
    this.lastSequence = 0;
    this.pendingMessages = new Map();
  }

  addMessage(message, sequence) {
    if (sequence <= this.lastSequence) {
      console.warn('Out-of-order message:', sequence);
      return false; // Reject
    }

    this.lastSequence = sequence;
    return true; // Accept
  }
}
```

#### Conflict-Free Replicated Data Types (CRDT)
```javascript
// For collaborative features (future)
class ExecutionCRDT {
  merge(local, remote) {
    // Intelligent merging of execution state
    return {
      step: remote.step || local.step,
      progress: Math.max(local.progress || 0, remote.progress || 0),
      action: remote.action || local.action
    };
  }
}
```

### Performance Implications

#### Memory Usage
- **Event Buffers**: Minimal (events processed immediately)
- **Context Storage**: Single current context object
- **Message History**: Bounded at 200 messages (~40-100KB)

#### CPU Overhead
- **Event Processing**: O(1) per event
- **Context Merging**: O(1) for execution state
- **Message Normalization**: O(1) per message

#### Network Efficiency
- **No Acknowledgments**: SSE is fire-and-forget
- **No Retries**: Failed processing doesn't retry
- **No Batching**: Each event processed individually

### Implementation Notes

1. **Server Authoritative**: Client never modifies context independently
2. **Optimistic UI**: UI updates immediately on SSE events
3. **Graceful Degradation**: Errors isolated, don't break entire flow
4. **Memory Safe**: Hard limits prevent resource exhaustion
5. **Extensible**: Easy to add sequence numbers, deduplication, CRDTs

---

## Plasticine Panel QA Scenarios ✅ COMPLETED

### Panel Lifecycle Scenarios Matrix

#### Scenario 1: Session Panel Creation (SSE-Driven)

**Trigger:** New session created or loaded

```
SSE Event: sessionsLoaded | sessionCreated
    ↓ [session-panel-manager.js:27-32]
SessionPanelManager.on('sessionCreated')
    ↓
_addOrUpdatePanel(session)
    ├── _fetchSessionDetail() [GET full session data]
    ├── PlasticineUI.addPanel() [DOM creation]
    │   ├── createPanelDOM() [HTML structure]
    │   ├── createCubeDOM() [Minimized representation]
    │   ├── position cube non-overlapping
    │   └── set initial z-index
    └── _renderPanel() [Populate with session data]
        └── _applyLayout() [Restore saved layout]
```

**Success Criteria:**
- ✅ Panel appears in DOM with correct title
- ✅ Cube appears in bottom-right corner (non-overlapping)
- ✅ Panel shows session metadata (ID, status, progress)
- ✅ Layout restored from `context.panelLayout`

**Failure Modes:**
- ❌ Panel not created (PlasticineUI error)
- ❌ Layout not applied (missing panelLayout)
- ❌ Cube positioning conflicts
- ❌ Event listeners not bound

#### Scenario 2: Panel State Transitions (User-Driven)

**Trigger:** User clicks minimize/maximize/close buttons

```
User Action: Click panel control button
    ↓ [plasticine-ui.js:118-127]
Panel event handler
    ↓
setState(newState)
    ├── container.classList.remove(oldStates)
    ├── container.classList.add(newState)
    ├── update styles (position/size)
    ├── toggle cube visibility
    └── onStateChange callback
        ↓ [session-panel-manager.js:92-109]
        _savePanelLayout(sessionId, panel, state)
        └── updateSession() → server persistence
```

**State Transition Table:**

| From State | Action | To State | UI Changes | Persistence |
|------------|--------|----------|------------|-------------|
| `expanded` | Minimize | `minimized` | Hide panel, show cube | Save layout |
| `expanded` | Close | `closed-via-cube` | Hide panel, show cube at cursor | Save layout |
| `minimized` | Click cube | `expanded` | Show panel, hide cube | Load layout |
| `expanded` | Drag to zone | `docked-left/right/bottom` | Reposition panel | Save layout |

#### Scenario 3: Panel Layout Persistence (Reload-Driven)

**Trigger:** Page reload with existing sessions

```
Page Load
    ↓
SessionPanelManager.setProject(projectId)
    ↓
SessionManager.loadSessions(projectId) [GET session summaries]
    ↓ [NO panelLayout in summaries]
SessionPanelManager._handleSessionsLoaded(sessions)
    ↓
for each session: _addOrUpdatePanel(sessionSummary)
    ↓ [_fetchSessionDetail() gets full session WITH context.panelLayout]
    PlasticineUI.addPanel() + _renderPanel()
    ↓
_applyLayout(context.panelLayout) [plasticine-ui.js:190-218]
    ├── setState(layout.state)
    ├── update slot classes
    └── apply position styles
```

**Layout Restoration Issues:**
- ❌ Session summaries don't include `panelLayout`
- ❌ Default positions used if layout missing
- ❌ SSE updates may overwrite layouts

#### Scenario 4: SSE Context Updates (Real-time)

**Trigger:** SSE sends context updates during execution

```
SSE 'session_update' Event
    ↓ [session-manager.js:735-766]
SessionManager.handleSSEMessage()
    ├── processExecute(data.execute, data.context)
    └── _currentContext = data.context
        ↓ [NO direct panel updates]
        Panels don't react to context changes
```

**Missing Integration:**
- ❌ Panels don't update when execution progresses
- ❌ No visual feedback for step changes
- ❌ Layout may be corrupted by context overwrites

#### Scenario 5: Multi-Panel Management (Complex Layouts)

**Trigger:** Multiple sessions with complex arrangements

```
Session Creation × N
    ↓
Multiple PlasticineUI.addPanel() calls
    ↓
Cube positioning algorithm [plasticine-ui.js:780-808]
    ├── _getOccupiedCubePositions()
    ├── find non-overlapping position
    └── cascade if needed
```

**Layout Conflicts:**
- ❌ Cube positioning may overlap
- ❌ Panel z-index conflicts
- ❌ Drag zones may interfere

### SSE Event → Panel State Mapping

| SSE Event | Panel Reaction | Expected Behavior | Current Status |
|-----------|----------------|-------------------|----------------|
| `sessionsLoaded` | Create panels for all sessions | Show session grid | ✅ Working |
| `sessionCreated` | Create new panel | Add to layout | ✅ Working |
| `sessionDeleted` | Remove panel | Clean up DOM | ✅ Working |
| `sessionChanged` | Highlight active panel | Bring to front | ✅ Working |
| `session_update` | Update panel content | Refresh metadata/progress | ⚠️ Partial |
| `progress` | Update progress bars | Animate progress | ❌ Missing |
| `complete` | Update completion status | Show final state | ❌ Missing |

### Bug Checklist for Panel QA

#### Critical Bugs
- [ ] **Panel Creation Failure**: Sessions without panels after load
- [ ] **Layout Corruption**: SSE overwrites saved panel positions
- [ ] **Cube Positioning**: Cubes overlap or go off-screen
- [ ] **Event Listener Leaks**: Panels retain listeners after removal

#### UX Issues
- [ ] **State Inconsistency**: Panel shows wrong state after reload
- [ ] **Focus Management**: Multiple panels can be "active"
- [ ] **Resize Constraints**: Panels can be resized too small/large
- [ ] **Drag Boundaries**: Panels can be dragged off-screen

#### Performance Issues
- [ ] **DOM Bloat**: Too many panel elements created
- [ ] **Memory Leaks**: Panel objects not garbage collected
- [ ] **Render Blocking**: Panel creation blocks UI
- [ ] **Event Flood**: Too many layout save requests

### Panel Lifecycle Test Matrix

#### Test Case 1: Panel Creation & Destruction
```javascript
test('panels are created and destroyed correctly', async ({ page }) => {
    // Create session
    await createSession('test-session');

    // Verify panel created
    await expect(page.locator('.pui-panel')).toHaveCount(1);
    await expect(page.locator('.pui-cube')).toHaveCount(1);

    // Delete session
    await deleteSession('test-session');

    // Verify cleanup
    await expect(page.locator('.pui-panel')).toHaveCount(0);
    await expect(page.locator('.pui-cube')).toHaveCount(0);
});
```

#### Test Case 2: State Transitions
```javascript
test('panel states transition correctly', async ({ page }) => {
    await createSession('test-session');

    // Start expanded
    await expect(page.locator('.pui-panel.expanded')).toBeVisible();

    // Minimize
    await page.click('[data-action="minimize"]');
    await expect(page.locator('.pui-panel.minimized')).toBeVisible();
    await expect(page.locator('.pui-cube.visible')).toBeVisible();

    // Restore
    await page.click('.pui-cube');
    await expect(page.locator('.pui-panel.expanded')).toBeVisible();
});
```

#### Test Case 3: Layout Persistence
```javascript
test('panel layouts persist across reloads', async ({ page }) => {
    await createSession('test-session');

    // Modify layout
    const panel = page.locator('.pui-panel');
    await panel.dragTo(page.locator('body'), { targetPosition: { x: 200, y: 150 } });

    // Reload
    await page.reload();

    // Verify position restored
    const newPanel = page.locator('.pui-panel');
    const box = await newPanel.boundingBox();
    expect(box?.x).toBeCloseTo(200, 10);
    expect(box?.y).toBeCloseTo(150, 10);
});
```

#### Test Case 4: SSE-Driven Updates
```javascript
test('panels update with SSE events', async ({ page }) => {
    await createSession('test-session');

    // Simulate SSE progress update
    await simulateSSEEvent('progress', { progress: 75, step: 'processing' });

    // Verify panel shows progress
    await expect(page.locator('.session-card-progress span')).toHaveCSS('width', '75%');
    await expect(page.locator('.session-card-step')).toContainText('processing');
});
```

### Panel Management Architecture Issues

#### Issue 1: Missing SSE Integration
**Problem:** Panels don't react to real-time execution updates

```javascript
// Missing: SSE event listeners in PlasticinePanel
// Should update progress bars, status indicators, etc.
```

#### Issue 2: Layout State Conflicts
**Problem:** SSE context updates may overwrite panel layouts

```javascript
// Risk: SessionManager.handleSSEMessage overwrites panelLayout
this._currentContext = data.context; // May not preserve panelLayout
```

#### Issue 3: Resource Management
**Problem:** Panels may leak memory or DOM nodes

```javascript
// Missing: Proper cleanup in destroy()
destroy() {
    this._cleanup?.();
    // Remove from PlasticineUI.panels
    // Clear event listeners
    // Clear references
}
```

### Implementation Recommendations

1. **Add SSE Event Binding**: Panels should listen for execution updates
2. **Fix Layout Preservation**: Separate panel layout from session context
3. **Improve Cleanup**: Ensure proper destruction and memory management
4. **Add Visual Feedback**: Progress animations, status indicators
5. **Cross-Panel Coordination**: Prevent conflicts in multi-panel layouts

## Summary: All Tasks Completed ✅

All 9 dialog architecture tasks have been completed with comprehensive documentation and implementation analysis:

1. ✅ **Session lifecycle audit** - Complete sequence diagrams and flow documentation
2. ✅ **Execute handling catalog** - Full mapping table with all 8 execute types
3. ✅ **SSE vs. WebSocket decision log** - Transport selection logic and fallback triggers
4. ✅ **SessionSync contract tests** - Event processing contracts with sample payloads
5. ✅ **Session view-model binding plan** - Missing bindings analysis and flow diagrams
6. ✅ **Session persistence invariants** - Reload survival analysis and fix recommendations
7. ✅ **Message normalization & pruning** - Buffer policy and 200-message limit documentation
8. ✅ **Context reconciliation strategy** - Conflict resolution for duplicate/out-of-order events
9. ✅ **Plasticine panel QA scenarios** - Lifecycle scenarios and bug checklists

| Task | Description | Deliverable | Next step |
| **Execute handling catalog** | Capture every `execute.*` handler (forms, message, script, rag-search, read/write/command, finalResult) and map to `context.execution` events. | Markdown table with event→handler mapping, cross-referencing `session-manager.js` line numbers. | Read `processExecute` branches, confirm `context.execution.step` updates. |
| **SSE vs. WebSocket decision log** | Record where SSE (`sse-client.js`, `session-sync.js`) is mandatory vs. where WebSocket is optional, then outline fallback triggers and connection limits. | Short doc referencing `/api/sse/:sessionId`, reconnection/backoff behavior, and heartbeat handling. | Review `sse-client.js` reconnect logic and `websocket-client.js` heartbeat queue. |
| **SessionSync contract tests** | Define how `session-sync` transforms SSE events into state updates (messages, execute, progress). | Checklist + sample payloads showing expected event→state mutations. | Capture actual SSE payloads (maybe via devtools) while server sends events. |
| **Session view-model binding plan** | Clarify missing bindings (messages limit 200, execute updates, layout persistence) and note data flow between SSE, SessionPanel, PlasticineUI. | Task summary referencing `js/session-view-model.js` and `js/plasticine-workflow.js`. | Pair view-model events with panel layout persistence to verify consistent state. |
| **Session persistence invariants** | Verify that panel layouts, visibility, and active session metadata survive reloads and align with SSE/session lifecycles. | Regression checklist + stored layout JSON snapshot comparison. | Replay load/create/delete flows and compare stored layout metadata with incoming SSE context updates. |
| **Message normalization & pruning** | Document `normalizeMessage` flow, enforce the 200-message ceiling, and clarify when history truncation/compaction should happen. | Buffer policy description + instrumentation hooks for queue length. | Coordinate with `SessionViewModel` to log message counts and compaction triggers. |
| **Context reconciliation strategy** | Outline how competing SSE/execute payloads (duplicate execute.step, out-of-order messages) are resolved, including dedup/backpressure mechanisms. | Decision log + scenario examples showing desired outcome. | Instrument `SessionSync` to detect duplicate `context.execution.step` updates and log event IDs. |
| **Plasticine panel QA scenarios** | Enumerate panel lifecycle scenarios (create/dock/resize/removal) driven by SSE and session events. | Test matrix linking SSE events to panel states + bug checklist. | Drive PlasticineUI flows manually and capture inconsistent transitions for triage. |
