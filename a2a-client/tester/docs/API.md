# Tester API Documentation

## Overview

The Tester API provides HTTP endpoints for remote control of A2A web clients through Server-Sent Events (SSE). Commands are routed from CLI tools through the API server to connected web clients.

## Base URL
```
http://localhost:3001/api/tester
```

## Authentication
All endpoints support optional authentication via Bearer token in Authorization header.

## Endpoints

### POST /api/tester/command

Send a command to a specific web client session.

#### Request
```http
POST /api/tester/command
Content-Type: application/json

{
  "type": "tester_command",
  "command": "panel_control",
  "data": {
    "action": "show",
    "panelId": "task-panel"
  },
  "sessionId": "tester-session",
  "timestamp": "2026-03-06T21:27:00.000Z"
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"tester_command"` |
| `command` | string | Yes | Command name to execute |
| `data` | object | No | Command-specific data payload |
| `sessionId` | string | Yes | Target session ID |
| `timestamp` | string | No | ISO timestamp (auto-generated if omitted) |

#### Response (Success)
```json
{
  "success": true,
  "commandId": "cmd_1234567890_abc123",
  "sessionId": "tester-session",
  "command": "panel_control",
  "message": "Command sent to web client",
  "timestamp": "2026-03-06T21:27:00.000Z"
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": "No web clients connected to session",
  "sessionId": "tester-session"
}
```

#### Error Codes
- `400` - Invalid request data
- `404` - No clients connected to session
- `500` - Internal server error

### GET /api/tester/status

Get current tester system status.

#### Request
```http
GET /api/tester/status
```

#### Response
```json
{
  "success": true,
  "data": {
    "service": "tester-api",
    "timestamp": "2026-03-06T21:27:00.000Z",
    "sseManager": {
      "activeConnections": 3,
      "sessionCount": 2
    }
  }
}
```

### GET /api/tester/sessions

Get list of active tester sessions.

#### Request
```http
GET /api/tester/sessions
```

#### Response
```json
{
  "success": true,
  "data": {
    "sessions": [
      "session-1",
      "session-2",
      "tester-session"
    ],
    "count": 3,
    "timestamp": "2026-03-06T21:27:00.000Z"
  }
}
```

### POST /api/tester/broadcast

Broadcast a command to all connected sessions.

#### Request
```http
POST /api/tester/broadcast
Content-Type: application/json

{
  "command": "ping",
  "data": {},
  "excludeSessionId": "session-to-exclude"
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command` | string | Yes | Command to broadcast |
| `data` | object | No | Command data payload |
| `excludeSessionId` | string | No | Session ID to exclude from broadcast |

#### Response
```json
{
  "success": true,
  "commandId": "broadcast_1234567890_abc123",
  "command": "ping",
  "sentCount": 2,
  "message": "Command broadcasted to 2 sessions",
  "timestamp": "2026-03-06T21:27:00.000Z"
}
```

## Command Reference

### Panel Commands

#### panel_control
Unified panel control command.

**Data:**
```json
{
  "action": "show|hide|move|resize|minimize|maximize|close",
  "panelId": "string",
  "position": {"x": number, "y": number},  // for move
  "size": {"width": number, "height": number}  // for resize
}
```

**Actions:**
- `show` - Show panel
- `hide` - Hide panel
- `move` - Move panel to position
- `resize` - Resize panel
- `minimize` - Minimize panel
- `maximize` - Maximize panel
- `close` - Close panel

### Session Commands

#### session_control
Unified session control command.

**Data:**
```json
{
  "action": "create|list|switch|delete|status",
  "sessionId": "string",  // for switch/delete/status
  "title": "string"       // for create
}
```

### Utility Commands

#### ping
Test connectivity.

**Data:** `{}`

**Response:**
```json
{
  "pong": true,
  "timestamp": "2026-03-06T21:27:00.000Z",
  "sessionId": "tester-session"
}
```

#### echo
Echo data back to sender.

**Data:** Any JSON object

**Response:**
```json
{
  "echoed": {"your": "data"},
  "timestamp": "2026-03-06T21:27:00.000Z"
}
```

#### get_status
Get web client status information.

**Data:** `{}`

**Response:**
```json
{
  "status": "online",
  "timestamp": "2026-03-06T21:27:00.000Z",
  "sessionId": "tester-session",
  "userAgent": "Mozilla/5.0...",
  "url": "http://localhost:5173",
  "panels": [...],
  "sessions": 3
}
```

#### get_timestamp
Get current timestamp.

**Data:** `{}`

**Response:**
```json
{
  "timestamp": "2026-03-06T21:27:00.000Z",
  "unix": 1678140420000
}
```

#### debug_info
Get detailed debug information.

**Data:** `{}`

**Response:**
```json
{
  "timestamp": "2026-03-06T21:27:00.000Z",
  "location": "http://localhost:5173",
  "userAgent": "Mozilla/5.0...",
  "screen": {
    "width": 1920,
    "height": 1080,
    "availWidth": 1920,
    "availHeight": 1040
  },
  "viewport": {
    "width": 1200,
    "height": 800
  },
  "sessionStore": {
    "currentSession": "session-1",
    "totalSessions": 3
  },
  "panelManager": {
    "panels": ["task", "chat", "logs"],
    "visiblePanels": ["task", "chat"]
  },
  "transportManager": {
    "state": {
      "connectionState": "connected",
      "activeTransport": "sse",
      "sessionId": "tester-session"
    },
    "connected": true
  },
  "commandHistory": [...]
}
```

## Event Flow

### Command Execution Flow
1. CLI sends HTTP POST to `/api/tester/command`
2. API server validates request and session
3. Command is broadcast via SSE to web client
4. Web client receives command through TransportManager
5. CommandHandler processes the command
6. Response is sent back via WebSocket
7. CLI receives and displays response

### Event Types

#### tester_command
Command sent from API server to web client.

```json
{
  "type": "tester_command",
  "commandId": "cmd_123",
  "command": "panel_control",
  "data": {...},
  "sessionId": "session-1",
  "timestamp": "2026-03-06T21:27:00.000Z",
  "source": "api_server"
}
```

#### tester_broadcast
Broadcast command sent to all sessions.

```json
{
  "type": "tester_broadcast",
  "commandId": "broadcast_123",
  "command": "ping",
  "data": {},
  "timestamp": "2026-03-06T21:27:00.000Z",
  "source": "api_server"
}
```

#### tester_response
Response from web client to API server.

```json
{
  "type": "tester_response",
  "commandId": "cmd_123",
  "response": {
    "success": true,
    "result": {...}
  },
  "timestamp": "2026-03-06T21:27:00.000Z"
}
```

## Error Handling

### Common Error Responses

#### Invalid Command
```json
{
  "success": false,
  "error": "Unknown command: invalid_command"
}
```

#### Session Not Found
```json
{
  "success": false,
  "error": "No web clients connected to session",
  "sessionId": "invalid-session"
}
```

#### Validation Error
```json
{
  "success": false,
  "error": "panelId is required for panel commands"
}
```

#### Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Rate Limiting

- Maximum 100 commands per minute per session
- Burst limit of 10 commands per second
- Automatic backoff on rate limit exceeded

## Monitoring

### Metrics Endpoints

#### SSE Connection Metrics
```http
GET /api/sse/metrics
```

#### Tester API Metrics
```http
GET /api/tester/metrics
```

### Logging

All tester commands are logged with the following information:
- Command ID and type
- Session ID and timestamp
- Success/failure status
- Execution time
- Error details (if applicable)

## Security

### Session Isolation
- Commands are isolated to specific sessions
- No cross-session command execution
- Session validation on all endpoints

### Input Validation
- JSON schema validation for command data
- Sanitization of command parameters
- Timeout protection for command execution

### Authentication (Optional)
- Bearer token authentication support
- Session-based authorization
- Configurable authentication requirements