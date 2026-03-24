# TransportManager API Reference

> **⚠️ Deprecated**: This module was planned but never implemented. Communication with server is now handled by **API Integration** (api-integration.js).

## Overview

```javascript
const transport = TransportManager.init({
  apiBase: '/api',
  heartbeatInterval: 30000
});
```

## Initialization

### `TransportManager.init(options)`

Initializes the TransportManager instance.

**Parameters:**
- `options.apiBase` (string): Base API URL (default: '/api')
- `options.sessionId` (string, optional): Initial session ID

**Returns:** TransportManager instance

**Example:**
```javascript
const transport = TransportManager.init({
  apiBase: '/api'
});
```

## Connection Methods

### `TransportManager.connect(sessionId)`

Establishes a connection to the session using the primary transport (SSE).

**Parameters:**
- `sessionId` (string): Target session ID

**Returns:** Promise<boolean> - True if connected

### `TransportManager.disconnect()`

Closes the active connection and cleans up listeners.

### `TransportManager.sendMessage(sessionId, result)`

Sends a result object to the server.

**Parameters:**
- `sessionId` (string): Session ID
- `result` (Object): Action-key shaped result (e.g., `{ choice: id }` or `{ result: { action: data } }`)

**Returns:** Promise<Object> - Acknowledgement

## Connection State

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `connectionState` | string | 'disconnected', 'connecting', 'connected', 'reconnecting' |
| `activeTransport` | string | 'sse' \| 'ws' \| 'none' |
| `sessionId` | string\|null | Current session ID |

### Connection Methods

| Method | Description |
|--------|-------------|
| `isConnected()` | Returns true if any transport is active |
| `getState()` | Returns full connection state object |

## Key Differences from SSE/WebSocket

- **Primary Transport (SSE)**: Standard for real-time updates from server.
- **Auto-fallback (WebSocket)**: Seamlessly switches to WebSocket if SSE is blocked or fails.
- **Unified Interface**: Same API regardless of the underlying transport.
- **Heartbeat & Recovery**: Automatic reconnection with exponential backoff.
