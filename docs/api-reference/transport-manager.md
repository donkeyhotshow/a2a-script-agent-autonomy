# TransportManager API Reference

The TransportManager handles real-time communication between client and server, with SSE as primary transport and WebSocket as fallback.

## Overview

```javascript
const transport = TransportManager.init({
  apiBase: '/api',
  primaryTransport: 'sse'  // 'sse' or 'websocket'
});
```

## Initialization

### `TransportManager.init(options)`

Initializes the TransportManager instance.

**Parameters:**
- `options.apiBase` (string): Base API URL (default: '/api')
- `options.sessionId` (string, optional): Initial session ID
- `options.primaryTransport` (string): Primary transport ('sse' or 'websocket', default: 'sse')

**Returns:** TransportManager instance

**Example:**
```javascript
const transport = TransportManager.init({
  apiBase: '/api',
  primaryTransport: 'sse'
});
```

## Connection Management

### `TransportManager.connect(sessionId, options)`

Establishes connection to session using primary transport, falls back to secondary.

**Parameters:**
- `sessionId` (string): Session ID to connect to
- `options` (Object, optional): Connection options

**Returns:** Promise<boolean> - true if connected successfully

**Emits:** `'connecting'`, `'connected'` or `'error'`

**Algorithm:**
1. Try SSE connection first (if primaryTransport is 'sse')
2. If SSE fails, try WebSocket fallback
3. Start heartbeat monitoring on successful connection

### `TransportManager.disconnect()`

Closes all active connections and stops heartbeat.

**Emits:** `'disconnected'`

**Side Effects:** Stops heartbeat interval, closes SSE/WebSocket connections

## Transport Methods

### Primary Transport: SSE (Server-Sent Events)

#### `TransportManager._trySSE(sessionId)` (private)

Attempts SSE connection to session.

**Parameters:**
- `sessionId` (string): Session ID

**Returns:** Promise<boolean>

**Connection URL:** `{apiBase}/sse/{sessionId}?token={token}`

**Events Forwarded:**
- `connected`, `message`, `log`, `progress`, `status`
- `task_response`, `session_update`, `action_proposal`
- `action_executing`, `step_result`, `complete`, `error`
- `node_added`, `node_updated`, `edge_added`

### Fallback Transport: WebSocket

#### `TransportManager._tryWebSocket(sessionId)` (private)

Attempts WebSocket connection to session.

**Parameters:**
- `sessionId` (string): Session ID

**Returns:** Promise<boolean>

**Connection URL:** `ws{s}://{host}{apiBase}/ws/{sessionId}`

**Message Format:**
```javascript
{
  type: string,        // Event type
  payload: Object,     // Event data
  sessionId: string,   // Session ID
  timestamp: string    // ISO timestamp
}
```

## Message Sending

### `TransportManager.send(type, payload)`

Sends message through active transport.

**Parameters:**
- `type` (string): Message type
- `payload` (Object, default: {}): Message data

**Returns:** boolean - true if sent successfully

**Behavior:**
- WebSocket: Sends JSON message directly
- SSE-only: Falls back to HTTP POST via `_sendViaHttp()`

### `TransportManager._sendViaHttp(type, payload)` (private)

Sends message via HTTP POST when WebSocket unavailable.

**Parameters:**
- `type` (string): Message type
- `payload` (Object): Message data

**Returns:** Promise<boolean>

**Endpoint:** `POST {apiBase}/sessions/{sessionId}/message`

## Heartbeat & Health Monitoring

### `TransportManager._startHeartbeat()` (private)

Starts connection health monitoring.

**Interval:** 30 seconds
**Timeout:** 90 seconds without pong response

**Behavior:**
- Sends ping through WebSocket (if active)
- Checks for pong responses
- Triggers reconnection on timeout

### `TransportManager._stopHeartbeat()` (private)

Stops heartbeat monitoring.

## Reconnection Logic

### `TransportManager._handleTransportError(transport, error)`

Handles transport failures and initiates reconnection.

**Parameters:**
- `transport` (string): Failed transport ('sse' or 'websocket')
- `error` (Object): Error details

**Behavior:**
- Emits `'transportError'`, `'reconnecting'`
- Schedules reconnection with exponential backoff
- Maximum 5 attempts, then disconnects

### `TransportManager._scheduleReconnect()` (private)

Schedules reconnection attempt with backoff.

**Backoff Formula:** `baseDelay * 2^(attempts - 1)`
- Base delay: 3000ms
- Max attempts: 5

## Event System

### `TransportManager.on(event, callback)`

Subscribes to transport events.

**Parameters:**
- `event` (string): Event name
- `callback` (Function): Event handler

**Returns:** Function - unsubscribe function

### `TransportManager.off(event, callback)`

Unsubscribes from events.

**Parameters:**
- `event` (string): Event name
- `callback` (Function): Handler to remove

## Events

### Connection Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connecting` | `{ sessionId }` | Connection attempt started |
| `connected` | `{ sessionId, transport, fallback? }` | Successfully connected |
| `disconnected` | `{ sessionId, reason? }` | Connection closed |
| `reconnecting` | `{ transport, attempt, maxAttempts }` | Reconnection attempt |
| `transportError` | `{ transport, error, sessionId }` | Transport failure |

### Data Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{ type, data }` or `Message` | Generic message received |
| `connected` | Session connection confirmation | |
| `log` | Log entry | |
| `progress` | Progress update | |
| `status` | Status change | |
| `task_response` | Task execution response | |
| `session_update` | Session state update | |
| `action_proposal` | Action proposal | |
| `action_executing` | Action execution started | |
| `step_result` | Step execution result | |
| `complete` | Task completion | |
| `error` | Error occurred | |
| `node_added` | Node added (workflow) | |
| `node_updated` | Node updated (workflow) | |
| `edge_added` | Edge added (workflow) | |

## State Access

### `TransportManager.getState()`

Returns current transport state.

**Returns:** Object
```javascript
{
  connectionState: 'disconnected' | 'connecting' | 'connected',
  activeTransport: 'sse' | 'websocket' | null,
  sessionId: string | null,
  reconnectAttempts: number
}
```

### `TransportManager.isConnected()`

Checks if currently connected.

**Returns:** boolean

**Logic:** Returns true if `connectionState === 'connected'`

## Configuration

### Connection Timeouts

| Setting | Value | Description |
|---------|-------|-------------|
| SSE Connection Timeout | 10 seconds | Max time to establish SSE |
| WebSocket Connection Timeout | 10 seconds | Max time to establish WebSocket |
| Heartbeat Interval | 30 seconds | Ping frequency |
| Heartbeat Timeout | 90 seconds | Max time without pong |

### Reconnection Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Max Reconnect Attempts | 5 | Maximum retry attempts |
| Base Reconnect Delay | 3000ms | Initial delay |
| Backoff Multiplier | 2 | Exponential backoff factor |

## Error Handling

TransportManager handles various error conditions:

### SSE Errors
- **CORS blocking**: Cross-origin restrictions
- **Network failures**: DNS, connectivity issues
- **Server errors**: SSE endpoint unavailable

### WebSocket Errors
- **Connection refused**: Server not accepting connections
- **Protocol errors**: WebSocket handshake failures
- **Timeout errors**: Connection establishment timeout

### Fallback Behavior
```javascript
// Automatic fallback sequence
SSE (primary) → WebSocket (fallback) → HTTP POST (last resort)
```

## Usage Examples

### Basic Connection
```javascript
const transport = TransportManager.init();

// Connect to session
const connected = await transport.connect('sess_123');
if (connected) {
  console.log('Connected successfully');
}

// Listen for messages
transport.on('message', (data) => {
  console.log('Received:', data);
});

// Send message (WebSocket only)
transport.send('custom_event', { data: 'value' });
```

### Event Handling
```javascript
transport.on('connected', ({ sessionId, transport }) => {
  console.log(`Connected via ${transport} to ${sessionId}`);
});

transport.on('disconnected', ({ reason }) => {
  console.log('Disconnected:', reason);
});

transport.on('transportError', ({ transport, error }) => {
  console.error(`Transport ${transport} failed:`, error);
});
```

### Error Recovery
```javascript
transport.on('reconnecting', ({ attempt, maxAttempts }) => {
  showReconnectToast(`Reconnecting... (${attempt}/${maxAttempts})`);
});

transport.on('error', (error) => {
  if (transport.getState().connectionState === 'disconnected') {
    showReconnectButton();
  }
});
```

### Manual Reconnection
```javascript
// Check connection status
if (!transport.isConnected()) {
  const reconnected = await transport.connect(currentSessionId);
}

// Get detailed state
const state = transport.getState();
console.log('Connection state:', state);
```

## Integration with SessionStore

TransportManager works closely with SessionStore for state synchronization:

```javascript
// Transport events update SessionStore
transport.on('message', (data) => {
  if (data.type === 'session_update') {
    sessionStore.applyServerResponse(data);
  }
});

// SessionStore can trigger transport actions
sessionStore.on('execute', (execute) => {
  if (execute.requiresRealTime) {
    transport.send('execute_update', execute);
  }
});
```

## Related Components

- **[SessionStore](../api-reference/session-store.md)** - State synchronization
- **[ActionHandler](../api-reference/action-handler.md)** - Action submissions
- **[WebAPIClient](../api-reference/web-api-client.md)** - HTTP fallback communication