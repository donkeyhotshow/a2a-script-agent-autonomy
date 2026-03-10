# TransportManager API Reference

The TransportManager handles communication between client and server using synchronous HTTP requests.

## Overview

```javascript
const transport = TransportManager.init({
  apiBase: '/api'
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

## Request Methods

### `TransportManager.request(method, path, body)`

Makes a synchronous HTTP request to the server.

**Parameters:**
- `method` (string): HTTP method ('GET', 'POST', 'PUT', 'DELETE')
- `path` (string): API path
- `body` (Object, optional): Request body

**Returns:** Promise<Object> - Server response with execute.ui

**Example:**
```javascript
// Send result and get execute.ui in response
const response = await transport.request('POST', '/sessions/sess_123/result', {
  projectId: 'proj_1',
  result: { message: 'user input' },
  sync: true
});

// Response contains execute.ui directly
if (response.execute?.ui) {
  handleUiCommand(response.execute.ui);
}
```

### `TransportManager.sendMessage(sessionId, data)`

Sends a message to a session.

**Parameters:**
- `sessionId` (string): Session ID
- `data` (Object): Message data

**Returns:** Promise<Object> - Server response

## Connection State

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `connectionState` | string | 'disconnected', 'connecting', 'connected' |
| `sessionId` | string\|null | Current session ID |

### State Methods

| Method | Description |
|--------|-------------|
| `isConnected()` | Returns true if session is active |
| `getState()` | Returns current connection state |

## Key Differences from SSE/WebSocket

- **No real-time connections**: All communication via HTTP request/response
- **Synchronous responses**: Server returns `execute.ui` in HTTP body
- **No heartbeat needed**: Connection state managed per-request
- **No reconnection logic**: Each request is independent
