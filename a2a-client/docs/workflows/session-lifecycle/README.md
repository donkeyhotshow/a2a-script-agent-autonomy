# Session Lifecycle Scenarios

This directory documents all session lifecycle workflows from creation to completion.

## Related Documentation

- **[Session Architecture Migration](../session-architecture-migration.md)** - Technical details of session architecture changes
- **[Context Synchronization Guide](../context-synchronization-guide.md)** - How session state is synchronized across components
- **[Dialog Architecture Tasks](../tasks/dialog-architecture-tasks.md)** - Session lifecycle audit and QA scenarios
- **[UNIFIED_ARCHITECTURE_COMPLETE](../UNIFIED_ARCHITECTURE_COMPLETE.md)** - Unified state management implementation
- **[Web UI DEV_STATE](../../DEV_STATE.md)** - Session persistence and state management overview

## Session Creation Flow

### Happy Path Scenario
```mermaid
sequenceDiagram
    participant U as User
    participant TF as TaskFlow
    participant SM as SessionManager
    participant TM as TransportManager
    participant SS as SessionStore
    participant UI as UI Panels

    U->>TF: Submit task form
    TF->>SM: createSession(task, projectId)
    SM->>API: POST /sessions
    API-->>SM: {sessionId, projectId}
    SM->>SS: reset(sessionId, projectId)
    SM->>TM: connect(sessionId)
    TM->>SSE: /api/sse/:sessionId
    SSE-->>TM: connection established
    TM->>SS: connection events
    SM->>UI: open task panel
    UI-->>U: Show loading state
```

### Error Scenarios

#### Network Failure During Creation
```
User submits task → Network fails → Show retry option → User retries → Success
```

#### Server Error Response
```
Task submit → 500 error → Display error modal → User can retry or cancel
```

#### Transport Connection Failure
```
Session created → SSE fails → WebSocket fallback → HTTP polling if needed
```

## Session Switching Flow

### Manual Session Switch
```mermaid
sequenceDiagram
    participant U as User
    participant SP as Session Panel
    participant SM as SessionManager
    participant TM as TransportManager
    participant SS as SessionStore

    U->>SP: Click different session
    SP->>SM: switchToSession(sessionId)
    SM->>TM: disconnect current
    TM->>SSE: close connection
    SM->>SS: setSession(sessionId)
    SM->>TM: connect(newSessionId)
    TM->>SSE: /api/sse/:newSessionId
    SSE-->>TM: new connection
    TM->>UI: update active session
```

### Project Context Switch
```
User selects project → Filter sessions → Auto-switch to first session in project
```

## Session States

| State | Description | Entry Conditions | Exit Conditions | UI Display |
|-------|-------------|------------------|-----------------|------------|
| **Created** | Session initialized but not active | POST /sessions success | Transport connected | Loading spinner |
| **Active** | Connected and receiving updates | SSE/WebSocket connected | User switches or deletes | Full panel UI |
| **Waiting** | Awaiting user input (form/message) | Execute received | User submits choice/message | Choice buttons / Continue button |
| **Processing** | Server processing user input | Choice/message submitted | New execute received | Progress indicator |
| **Completed** | Task finished successfully | Final result received | N/A | Completion summary |
| **Error** | Processing failed | Error response received | User retries or deletes | Error message + retry option |
| **Deleted** | Removed by user | User delete action | N/A | Panel removed, cleanup |

## Session Persistence

### Browser Session Persistence
- Active session ID stored in memory
- Panel layouts saved to localStorage
- Session context cached in SessionStore
- Automatic restoration on page reload

### Cross-Session State
- Project context maintained
- Recent sessions list preserved
- User preferences (settings modal)
- Authentication state

## Cleanup Scenarios

### Session Deletion Flow
```mermaid
sequenceDiagram
    participant U as User
    participant UI as Panel UI
    participant SM as SessionManager
    participant TM as TransportManager
    participant API as Server API

    U->>UI: Click delete button
    UI->>SM: deleteSession(sessionId)
    SM->>TM: disconnect(sessionId)
    TM->>SSE: close connection
    SM->>API: DELETE /sessions/:id
    API-->>SM: success
    SM->>UI: remove panel
    UI->>U: Panel disappears
```

### Browser Tab Close
```
Tab close → No explicit cleanup → Server handles orphaned sessions via timeout
```

### Network Interruption
```
Connection lost → Auto-reconnection → State preserved → Seamless recovery
```

## Session Recovery Scenarios

### Connection Recovery
```
SSE disconnect → WebSocket fallback → Reconnect attempt → State sync → Continue
```

### Page Reload Recovery
```
Page reload → Load from localStorage → Reconnect transport → Restore UI state
```

### Server Restart Recovery
```
Server down → Connection fails → Retry with backoff → Server back → Full resync
```

## Multi-Session Management

### Concurrent Sessions
- Maximum 10 active sessions per project
- Each session has independent transport connection
- UI panels stack vertically in right panel area
- Session switching preserves other session states

### Session Grouping
- Sessions grouped by project ID
- Project selector filters visible sessions
- Bulk operations (delete all in project)
- Session history with timestamps

## Validation Criteria

### Session Creation Tests
- [ ] Task input creates session with correct project ID
- [ ] Transport connects within 5 seconds
- [ ] UI shows loading state during creation
- [ ] Error handling for network failures
- [ ] Retry mechanism for transient failures

### Session Switching Tests
- [ ] Transport cleanup on switch (no connection leaks)
- [ ] UI state transfers correctly
- [ ] SSE reconnection completes within 3 seconds
- [ ] Panel focus updates immediately
- [ ] Other sessions remain active

### Session Persistence Tests
- [ ] Page reload restores active session
- [ ] Panel layouts preserved across reloads
- [ ] Project context maintained
- [ ] Authentication state survives refresh

### Cleanup Tests
- [ ] Delete removes panel immediately
- [ ] Transport connections closed
- [ ] Server session deleted
- [ ] No memory leaks in UI
- [ ] localStorage cleaned up