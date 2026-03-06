# A2A Web Client: Actions & Events Decomposition

## Overview

This document decomposes all actions/events in the A2A Script Agent web client to identify potential redundancies and complexity issues. The system consists of multiple interconnected components managing task execution, session state, real-time communication, and UI interactions.

## 1. UI Buttons & Controls

### Header Controls (`templates/header.html`)

| Button | Location | Event | Action | Target |
|--------|----------|-------|--------|--------|
| **📝 New Task** (`#newTaskBtn`) | Header right | `click` | Focus task input field | `#taskInputField` |
| **📁 Projects** (`#projectsBtn`) | Header right | `click` | Show projects modal | `#projectsModal` |
| **⚙️ Settings** (`#settingsBtn`) | Header right | `click` | Show settings modal | `#settingsModal` |
| **Send** (`#taskSendBtn`) | Header center | `submit` | Submit task form | TaskFlow.run() |

### Modal Controls (`index.html`)

| Button | Location | Event | Action | Target |
|--------|----------|-------|--------|--------|
| **Save** (`#saveSettings`) | Settings modal | `click` | Save API URL | localStorage + apiIntegration |
| **Cancel** (`#cancelSettings`) | Settings modal | `click` | Hide modal | `#settingsModal` |
| **Close** (`#closeSettingsModal`) | Settings modal | `click` | Hide modal | `#settingsModal` |
| **+ New Project** (`#newProjectBtn`) | Projects modal | `click` | Create new project | API POST /projects |
| **Close** (`#cancelProjects`) | Projects modal | `click` | Hide modal | `#projectsModal` |
| **Close** (`#closeProjectsModal`) | Projects modal | `click` | Hide modal | `#projectsModal` |

### Message Input Controls (`index.html`)

| Button | Location | Event | Action | Target |
|--------|----------|-------|--------|--------|
| **Send** (`#sendMessage`) | Message input | `click` | Send message | TaskFlow.sendMessageResult() |
| **Enter** (input) | Message input | `keypress` | Send message | TaskFlow.sendMessageResult() |

### Panel Controls (PlasticineUI)

| Button | Location | Event | Action | Target |
|--------|----------|-------|--------|--------|
| **Close** (×) | Panel header | `click` | Remove/close panel | PlasticineUI.removePanel() |
| **Minimize** (cube) | Panel header | `click` | Create cube + minimize | PanelCube.create() |
| **Drag** (header) | Panel header | `mousedown` | Move panel | PlasticineUI repositioning |

### Cube Controls (PanelCube)

| Button | Location | Event | Action | Target |
|--------|----------|-------|--------|--------|
| **Left Click** | Cube | `click` | Restore panel | PlasticineUI.addPanel() |
| **Right Click** | Cube | `contextmenu` | Change color | Cube color cycling |
| **Drag** | Cube | `mousedown` | Move cube | DOM repositioning |

## 2. System Events & Triggers

### Application Lifecycle Events (`app-task.js`)

| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `DOMContentLoaded` | Page load | `init()` | Initialize UI, load templates |
| `click` (#settingsBtn) | User click | Show modal | Display settings modal |
| `click` (#projectsBtn) | User click | Show modal | Display projects modal |
| `click` (#newTaskBtn) | User click | Focus input | Focus task input field |

### Form Events (`task-flow.js`)

| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `submit` (#taskSendForm) | Form submit | TaskFlow.init() | Start task execution |
| `click` (.task-flow-choice-btn) | Choice selection | sendChoice() | Submit choice to server |
| `click` (.task-flow-message-btn) | Continue button | sendMessageResult() | Send continue message |

### Communication Events

#### SSE Events (`sse-client.js`)
| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `onopen` | Connection established | emit('connected') | Notify connection success |
| `onmessage` | Server message | emit('message') | Forward parsed data |
| `onerror` | Connection error | emit('error') | Handle reconnection |
| `onclose` | Connection closed | Handle reconnect | Attempt reconnection |

#### WebSocket Events (`websocket-client.js`)
| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `onopen` | WS connected | Start heartbeat | Connection established |
| `onmessage` | WS message | _handleMessage() | Process real-time data |
| `onerror` | WS error | emit('error') | Handle connection error |
| `onclose` | WS closed | Attempt reconnect | Reconnection logic |

### Session Events (`session-manager.js`)

| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `sessionsLoaded` | API response | UI update | Render session list |
| `sessionCreated` | API response | UI update | Add to sessions list |
| `sessionDeleted` | API response | UI update | Remove from list |
| `sessionChanged` | User selection | UI update | Update active session |
| `conversationLoaded` | API response | UI update | Display messages |
| `formReceived` | Execute processing | UI update | Show choice form |
| `messageReceived` | Execute processing | UI update | Display message |
| `choiceSubmitted` | User action | API call | Send result to server |
| `executionStep` | Context update | UI update | Show current step |
| `executionProgress` | Context update | UI update | Update progress bar |

### Task Flow Events (`task-flow.js`)

| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `executionStep` (listen) | SessionManager | Re-render panel | Update step display |
| `executionProgress` (listen) | SessionManager | Re-render panel | Update progress bar |
| `finalResultReceived` (listen) | SessionManager | Re-render panel | Show completion |

### Session Sync Events (`session-sync.js`)

| Event | Trigger | Handler | Action |
|-------|---------|---------|--------|
| `message` | SSE message | pushMessage() | Add to view model |
| `task_response` | SSE message | applyContext() | Update session state |
| `session_update` | SSE message | applyContext() | Update session data |
| `progress` | SSE message | updateProgress() | Update progress |
| `status` | SSE message | applyContext() | Update status |
| `complete` | SSE message | applyContext() | Mark complete |
| `error` | SSE message | pushMessage() | Show error |
| `action_proposal` | SSE message | applyExecute() | Update execute state |
| `action_executing` | SSE message | applyExecute() | Update execute state |

## 3. Communication Flows

### HTTP API Calls

#### Session Management
- `POST /sessions` - Create session with task
- `GET /sessions/:id` - Get session details
- `GET /sessions?projectId=X` - List project sessions
- `DELETE /sessions/:id` - Delete session
- `PATCH /sessions/:id` - Update session
- `POST /sessions/:id/next` - Send task/result
- `POST /sessions/:id/result` - Submit result
- `POST /sessions/:id/action` - Select action

#### Projects Management
- `GET /projects` - List projects
- `POST /projects` - Create project

#### Requests (Async)
- `POST /requests` - Create async request
- `GET /requests/:id/status` - Check status
- `GET /requests/:id/result` - Get result
- `DELETE /requests/:id` - Cancel request

### Real-time Communication

#### SSE Endpoints
- `/sse` - Global events
- `/sse/:sessionId` - Session-specific events

#### WebSocket Endpoints
- `/ws/:sessionId` - WebSocket connection

### Data Flow Patterns

#### Task Execution Flow
1. User submits task → `POST /sessions` → Session created
2. Immediate response OR `promiseId` for polling
3. Poll `GET /requests/:id/status` until complete
4. Get result `GET /requests/:id/result`
5. Display execute object (form/message)

#### Choice Submission Flow
1. User selects choice → `POST /sessions/:id/next`
2. Server processes choice → Returns new execute
3. Update UI with new state

#### Message Continuation Flow
1. User sends message → `POST /sessions/:id/next`
2. Server processes message → Returns new execute
3. Update UI with response

## 4. Panel Management

### Panel Types (`PANEL_TYPES` in plasticine-workflow.js)

| Type | ID | Slot | Critical | Content |
|------|----|------|----------|---------|
| task | task-panel | floating | false | Task execution UI |
| logs | logs-panel | bottom | false | Log output display |
| chat | chat-panel | right | false | Chat messages |
| debug | debug-panel | bottom | false | Debug information |
| sessions | sessions-panel | left | false | Session management |
| settings | settings-panel | floating | false | Settings form |
| alerts | alerts-panel | header | true | System alerts |
| graph | graph-panel | left | false | Graph visualization |

### Panel States

| State | Description | Transitions |
|-------|-------------|-------------|
| **Created** | Panel added to DOM | → Minimized, Closed |
| **Minimized** | Converted to cube | → Restored, Moved |
| **Restored** | Full panel visible | → Minimized, Closed |
| **Closed** | Removed from DOM | → Created |

### Panel Interactions

| Action | Trigger | Effect |
|--------|---------|--------|
| **Minimize** | Close button click | Create cube, hide panel |
| **Restore** | Cube left-click | Show panel, remove cube |
| **Close** | Close button (critical=false) | Remove panel completely |
| **Drag** | Header mousedown | Reposition panel |
| **Bring to Front** | Click anywhere | Z-index management |

## 5. Session Lifecycle

### Session States

| State | Description | Entry | Exit |
|-------|-------------|-------|------|
| **Created** | Session initialized | `POST /sessions` | Task sent |
| **Active** | Task being processed | First response received | Completion/Error |
| **Waiting** | Awaiting user input | Form/message displayed | Choice/Message sent |
| **Completed** | Task finished | Final result received | N/A |
| **Error** | Processing failed | Error response | User retry |

### Session Data Flow

#### Context Object
```javascript
{
  task: "user input",
  messages: [...],           // conversation history
  execution: {               // current execution state
    step: "llm-request",
    action: "ai-action-name",
    progress: 75
  },
  docVirtual: {...}          // accumulated content
}
```

#### Execute Object Types
- **form**: Choice selection UI
- **message**: Display-only message with continue
- **script**: Client-side script execution
- **rag-search**: RAG search operation
- **read-file**: File reading operation
- **write-file**: File writing operation
- **execute-command**: Shell command execution

## 6. Real-time Event Handling

### SSE Message Types

| Type | Data Structure | UI Update |
|------|----------------|-----------|
| **message** | `{content, role, timestamp}` | Append to conversation |
| **task_response** | `{context, execute, messages}` | Update session state |
| **session_update** | `{context, execute}` | Update session data |
| **progress** | `{progress, action, step}` | Update progress bar |
| **status** | `{context, execute}` | Update execution status |
| **complete** | `{context, execute, result}` | Show completion |
| **error** | `{message, error}` | Show error message |

### WebSocket Message Types

| Type | Data Structure | Action |
|------|----------------|--------|
| **heartbeat** | `{type: "ping"}` | Send pong response |
| **session_update** | `{sessionId, data}` | Update session state |
| **execution_update** | `{step, progress, action}` | Update execution UI |
| **message** | `{content, role, metadata}` | Add to conversation |

## 7. Task Flow States

### Panel Display States (`setPanelContent`)

| State | UI Display | Data |
|-------|------------|------|
| **loading** | Spinner "Creating session…" | N/A |
| **sending** | Spinner "Sending…" | N/A |
| **fixated** | Session info + "Sending to server…" | `{sessionId, projectId}` |
| **firstResponse** | Execute rendering | `{execute, context}` |
| **response** | Execute rendering | `{execute, context}` |

### Execute Rendering Logic

#### Form Rendering
- Display title (optional)
- Render choice buttons
- Attach click handlers → `sendChoice()`
- Show progress bar + step info

#### Message Rendering
- Display message content
- Show "Continue" button
- Attach click handler → `sendMessageResult()`
- Show progress bar + step info

#### Default Rendering
- Show raw context + execute JSON
- For debugging/development

## 8. Component Interactions

### PlasticineUI ↔ TaskFlow
- TaskFlow creates panels via PlasticineUI
- TaskFlow listens to SessionManager events
- TaskFlow updates panel content based on execution state

### SessionManager ↔ SSE/WebSocket
- SSE/WebSocket deliver real-time updates
- SessionManager processes execute objects
- SessionManager emits events for UI updates

### SessionViewModel ↔ UI Components
- ViewModel holds conversation state
- Components bind to ViewModel changes
- Multiple components can display same data

### PanelCube ↔ PlasticineUI
- Cubes represent minimized panels
- Cube clicks restore panels
- Cube colors provide visual distinction

## 9. Identified Redundancies & Issues

### Redundant Communication Channels
- **SSE + WebSocket**: Both provide real-time updates
- **HTTP polling + SSE**: Async requests use both polling and SSE
- **Multiple session state sources**: Context, ViewModel, SessionManager

### Complex Event Propagation
- **Multiple event emitters**: SessionManager, TaskFlow, SSE all emit similar events
- **Event listener chains**: TaskFlow → SessionManager → SSE → UI updates
- **Duplicate state updates**: Same data updated through multiple paths

### UI State Management Issues
- **Multiple panel systems**: PlasticineUI panels + modal system + cube system
- **Inconsistent state**: Session state scattered across multiple objects
- **Complex panel lifecycle**: Create → Minimize → Restore → Close with multiple states

### Action Submission Complexity
- **Multiple submission methods**: Choice, Message, Script, RAG, File operations
- **Inconsistent result formats**: Action-key shape vs legacy formats
- **Complex execute processing**: Different handling for each execute type

### Recommendations for Simplification

1. **Consolidate Communication**: Choose SSE as primary, WebSocket as fallback
2. **Unify State Management**: Single source of truth for session state
3. **Simplify Panel System**: Reduce to core panel + modal system
4. **Standardize Actions**: Use action-key shape consistently
5. **Reduce Event Complexity**: Direct UI updates instead of chained events

---

*This decomposition reveals significant architectural complexity that could benefit from refactoring to reduce redundancy and improve maintainability.*