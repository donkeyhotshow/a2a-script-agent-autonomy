# Communication Scenarios

This directory documents all real-time communication workflows, transport mechanisms, and fallback scenarios.

## Related Documentation

- **[Session Architecture Migration](../session-architecture-migration.md)** - Transport layer changes and fallback implementation
- **[Testing SSE Tasks](../tasks/testing-sse-tasks.md)** - SSE reliability testing and heartbeat monitoring
- **[Dialog Architecture Tasks](../tasks/dialog-architecture-tasks.md)** - SSE vs WebSocket decision log and transport policy
- **[UNIFIED_ARCHITECTURE_COMPLETE](../UNIFIED_ARCHITECTURE_COMPLETE.md)** - Transport strategy implementation (SSE primary, WebSocket fallback)
- **[Web UI DEV_STATE](../../DEV_STATE.md)** - Transport endpoints and connection details

## Transport Hierarchy

### Primary Transport: SSE (Server-Sent Events)
```mermaid
graph TD
    A[Session Created] --> B[TransportManager.connect()]
    B --> C[Try SSE First]
    C --> D{SSE Success?}
    D -->|Yes| E[SSE Active - /api/sse/:sessionId]
    D -->|No| F[WebSocket Fallback]
    F --> G{WS Success?}
    G -->|Yes| H[WebSocket Active - /api/ws/:sessionId]
    G -->|No| I[HTTP Polling Fallback]
```

### Transport Specifications

| Transport | Protocol | Endpoint | Reliability | Use Case |
|-----------|----------|----------|-------------|----------|
| **SSE** | HTTP/1.1 + EventSource | `/api/sse/:sessionId` | High (auto-reconnect) | Primary real-time channel |
| **WebSocket** | WS/WSS | `/api/ws/:sessionId` | High (bidirectional) | SSE fallback, bidirectional |
| **HTTP Polling** | HTTP/1.1 | `/api/requests/:id/status` | Medium (manual) | Complete failure fallback |

## SSE Communication Flow

### Connection Establishment
```mermaid
sequenceDiagram
    participant TM as TransportManager
    participant SSE as SSE Client
    participant API as Server API
    participant SS as SessionStore

    TM->>SSE: connect(sessionId)
    SSE->>API: GET /api/sse/:sessionId
    API-->>SSE: HTTP 200 + EventSource stream
    SSE->>SSE: Setup event listeners
    SSE->>TM: emit('connected', {transport: 'sse'})
    TM->>SS: Update connection state
    TM->>UI: Show connected status
```

### SSE Event Types

| Event Type | Server Trigger | Data Structure | Client Action |
|------------|----------------|----------------|---------------|
| **message** | Assistant response | `{content, role, timestamp}` | Append to conversation |
| **task_response** | Execute update | `{context, execute, messages}` | Update session state |
| **session_update** | Context change | `{context, execute}` | Update session data |
| **progress** | Step progress | `{progress, action, step}` | Update progress UI |
| **status** | Status change | `{context, execute}` | Update execution status |
| **complete** | Task completion | `{context, execute, result}` | Show completion |
| **error** | Processing error | `{message, error}` | Display error |
| **heartbeat** | Keepalive | `{type: "ping", timestamp}` | Reset watchdog timer |

### Heartbeat Monitoring
```javascript
// SSE heartbeat pattern
data: {"type": "heartbeat", "timestamp": 1647123456789}
```

- **Interval**: Every 30 seconds
- **Timeout**: 35 seconds (5s grace period)
- **Action on timeout**: Mark connection degraded
- **Recovery**: Auto-reconnect triggers new heartbeat

## WebSocket Fallback Flow

### Fallback Trigger Conditions
```
SSE Connection Fails Due To:
├── Network timeout (>5s)
├── CORS blocking
├── Firewall restrictions
├── HTTP/2 incompatibility
└── Server-side SSE issues
```

### WebSocket Connection Sequence
```mermaid
sequenceDiagram
    participant TM as TransportManager
    participant WS as WebSocket Client
    participant API as Server API
    participant SS as SessionStore

    TM->>WS: connect(sessionId)
    WS->>API: WebSocket handshake /api/ws/:sessionId
    API-->>WS: WS connection established
    WS->>WS: Start heartbeat (30s intervals)
    WS->>TM: emit('connected', {transport: 'websocket'})
    TM->>SS: Update transport type
    TM->>UI: Update connection indicator
```

### WebSocket Message Format
```javascript
// Bidirectional messaging
{
  type: "session_update",
  sessionId: "sess_123",
  data: {
    context: {...},
    execute: {...}
  }
}
```

## HTTP Polling Fallback

### Polling Sequence
```mermaid
stateDiagram-v2
    [*] --> RequestSubmitted
    RequestSubmitted --> PollingStart: Start 5s interval
    PollingStart --> StatusCheck: GET /api/requests/:id/status
    StatusCheck --> Pending: Still processing
    StatusCheck --> Complete: Result available
    Pending --> PollingStart: Wait 5s
    Complete --> ResultFetch: GET /api/requests/:id/result
    ResultFetch --> [*]: Process result
```

### Polling Specifications
- **Interval**: 5 seconds (configurable)
- **Timeout**: 30 seconds per request
- **Retry**: 3 attempts per poll
- **Backoff**: Exponential (5s → 10s → 20s)
- **Max duration**: 5 minutes before manual retry

## Reconnection Scenarios

### Network Interruption Recovery
```mermaid
sequenceDiagram
    participant Client as Transport Client
    participant Server as Server
    participant UI as User Interface

    Client->>Server: Active connection
    Note over Client,Server: Network fails
    Client->>Client: Detect disconnection
    Client->>UI: Show reconnecting status
    Client->>Client: Start backoff timer (3s)
    Client->>Server: Attempt reconnection
    Server-->>Client: Connection restored
    Client->>Client: Sync missed events
    Client->>UI: Hide reconnecting status
```

### Backoff Strategy
| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | 3s | 3s |
| 2 | 6s | 9s |
| 3 | 12s | 21s |
| 4 | 24s | 45s |
| 5 | 30s | 75s |
| 6+ | 30s | Continues at 30s |

### State Synchronization on Reconnect
- **Event replay**: Server sends recent events
- **Context sync**: Full context state transfer
- **UI update**: Seamless transition without data loss
- **Progress preservation**: Execution state maintained

## Error Scenarios

### Transport Degradation
```
Connection unstable → Frequent reconnects → Show warning indicator → Continue operation
```

### Complete Transport Failure
```
All transports fail → Show offline mode → Queue actions → Retry on reconnection
```

### Server-Side Errors
```
SSE/WebSocket return errors → Fallback to next transport → Log error for debugging
```

### Message Corruption
```
Malformed JSON received → Skip invalid message → Log warning → Continue processing
```

## Connection State Management

### Connection States
```javascript
enum ConnectionState {
  DISCONNECTED = 'disconnected',     // No connection attempt
  CONNECTING = 'connecting',         // Establishing connection
  CONNECTED = 'connected',           // Active connection
  RECONNECTING = 'reconnecting',     // Recovering from failure
  DEGRADED = 'degraded',             // Unstable connection
  FAILED = 'failed'                  // All transports failed
}
```

### State Transitions
| From State | To State | Trigger | UI Action |
|------------|----------|---------|-----------|
| DISCONNECTED | CONNECTING | Session created | Show connecting spinner |
| CONNECTING | CONNECTED | Connection success | Show connected indicator |
| CONNECTED | RECONNECTING | Connection lost | Show reconnecting message |
| RECONNECTING | CONNECTED | Reconnect success | Hide reconnecting message |
| CONNECTED | DEGRADED | Heartbeat timeout | Show warning indicator |
| DEGRADED | CONNECTED | Heartbeat received | Hide warning |
| Any | FAILED | Max retries exceeded | Show offline mode |

## Message Ordering & Deduplication

### Event Ordering Requirements
- Messages must arrive in chronological order
- Context updates must be monotonic (progress increases)
- Duplicate events must be detected and ignored
- Out-of-order events trigger reconciliation

### Deduplication Strategy
```javascript
// Event ID based deduplication
const eventKey = `${event.type}_${event.timestamp}_${event.sequenceId}`;
if (processedEvents.has(eventKey)) {
  return; // Skip duplicate
}
processedEvents.add(eventKey);
```

## Performance Optimization

### Connection Pooling
- Single SSE/WebSocket per session
- Reuse connections across tab refreshes
- Automatic cleanup on session deletion
- Resource limits: max 10 concurrent connections

### Bandwidth Optimization
- **Compression**: Server-sent events compressed
- **Batching**: Multiple updates in single message
- **Filtering**: Client-side event filtering
- **Caching**: Context state cached locally

### Memory Management
- Event buffer limits (1000 events max)
- Automatic cleanup of old events
- Context size limits (10MB max)
- Garbage collection on session switch

## Monitoring & Debugging

### Connection Metrics
- Connection attempt success rate (>99.9%)
- Average reconnection time (<5s)
- Transport fallback frequency (<1%)
- Message delivery latency (<100ms)

### Debug Information
```javascript
// Transport debug info
{
  sessionId: "sess_123",
  connectionState: "connected",
  activeTransport: "sse",
  connectionTime: 1647123456789,
  reconnectCount: 0,
  lastHeartbeat: 1647123486789,
  messageCount: 42
}
```

## Validation Criteria

### SSE Tests
- [ ] SSE connects within 5 seconds
- [ ] Heartbeat received every 30 seconds
- [ ] Events processed in correct order
- [ ] Reconnection completes within 3 seconds
- [ ] Fallback to WebSocket when SSE blocked

### WebSocket Tests
- [ ] WebSocket connects when SSE fails
- [ ] Bidirectional messaging works
- [ ] Heartbeat mechanism functional
- [ ] Automatic fallback to polling

### Polling Tests
- [ ] HTTP polling starts after transport failure
- [ ] Status polling works at 5s intervals
- [ ] Result fetching succeeds
- [ ] Timeout handling correct

### Reconnection Tests
- [ ] Network interruption recovery works
- [ ] Backoff timing correct
- [ ] State synchronization on reconnect
- [ ] No data loss during reconnection
- [ ] UI shows appropriate status messages