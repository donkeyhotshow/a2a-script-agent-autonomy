# Transport Workflow

> **Files:** `transport/sse-transport.js`, `transport/websocket-transport.js`, `transport-manager.js`

## Overview

Transport layer handles real-time communication between web client and API server. Supports SSE (Server-Sent Events) and WebSocket protocols.

## Architecture

```
TransportManager (singleton)
    ├── SSETransport (default)
    └── WebSocketTransport (fallback)
            ↓
    Event dispatch to components
```

## When to Edit

| Task | File | Method |
|------|------|--------|
| Add transport type | `transport/` | New class extending BaseTransport |
| Change reconnection | `transport/sse-transport.js` | `reconnect()` |
| Add auth headers | `transport-manager.js` | Connection setup |
| Modify event routing | `transport-manager.js` | `dispatchEvent()` |

## Core Flow: Message Reception

```javascript
// 1. Transport receives message
SSETransport.onMessage(event)

// 2. Parse and validate
const message = JSON.parse(event.data);
this.validate(message);

// 3. TransportManager dispatches
TransportManager.dispatchEvent(message.type, message.payload);

// 4. Components receive
EventBus.emit(message.type, message.payload);
```

## Adding New Transport

```javascript
// transport/new-transport.js

import { BaseTransport } from './base-transport.js';

export class NewTransport extends BaseTransport {
  constructor(options) {
    super(options);
    this.connection = null;
  }

  async connect() {
    this.connection = await createConnection(this.url);
    this.connection.onMessage = (msg) => this.handleMessage(msg);
    this.state = 'connected';
  }

  async disconnect() {
    await this.connection.close();
    this.state = 'disconnected';
  }

  send(data) {
    this.connection.send(JSON.stringify(data));
  }

  handleMessage(msg) {
    this.emit('message', msg);
  }
}
```

## Event Routing

```javascript
// transport-manager.js

dispatchEvent(type, payload) {
  switch (type) {
    case 'session:created':
      EventBus.emit('session:created', payload);
      break;
    case 'ai-action:execute':
      EventBus.emit('ai-action:execute', payload);
      break;
    // Add new event types here
  }
}
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Connection drops | Network timeout | Increase `reconnectTimeout` |
| Duplicate events | Multiple listeners | Use `once()` or check `eventId` |
| Auth failures | Token expiry | Implement token refresh in `onError` |

## Testing

```bash
# Test transport layer
npm run test:transport

# Test SSE specifically
npm run test:transport:sse

# Test WebSocket
npm run test:transport:ws
```
