# PromiseId Flow Implementation

> **См.:** [new-request-flow/PROTOCOL.md](../../../docs/new-request-flow/PROTOCOL.md)

## Overview

This document describes the implementation of the promiseId flow in the A2A Client API Server. The promiseId flow enables asynchronous request handling where the client can poll for status updates and receive real-time notifications via WebSocket.

## Flow Architecture

### 1. Request Initiation

```
Client → /api/v1/invoke → Client API Server → /invoke → Server
```

**Steps:**
1. Client sends request to `/api/v1/invoke` with task, sessionId, and projectId
2. Client API Server forwards request to Server `/invoke` endpoint
3. Server processes request and returns response with optional `promiseId`
4. Client API Server stores `promiseId` in session data
5. Client API Server broadcasts promiseId via WebSocket to Web UI

### 2. Status Polling

```
Client → /api/v1/requests/:id/status → Client API Server → /requests/:id/status → Server
```

**Steps:**
1. Client polls `/api/v1/requests/:promiseId/status`
2. Client API Server forwards request to Server `/requests/:promiseId/status`
3. Server returns current status and context
4. Client API Server updates session with response data
5. Client API Server broadcasts status update via WebSocket

### 3. Session Updates

The session is updated with data from both invoke and status responses:

- **Context**: Merged from server responses
- **Execute**: Updated with current execute information
- **Messages**: Appended with new messages from server
- **Exchange Log**: Appended with exchange log entries
- **Status**: Updated if provided in response

## Implementation Details

### Execute Form Choices

When the server returns a form with selectable choices (first response), the client receives an `execute.form.choices` object. This is the new protocol format for interactive first responses.

#### Пример: Первый ответ с формой выбора

Когда сервер возвращает форму выбора действий:

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах"
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "fix-vue-imports", "label": "Виправити зламані імпорти" },
        { "id": "auto-ai", "label": "AI Action Generator" }
      ]
    }
  }
}
```

#### Client Processing

The client should:
1. Extract the `execute.form` object from the response
2. Display the form title and available choices
3. Wait for user selection
4. Send the selected choice ID as the next request

### Session Storage

Sessions are stored per-project in `<projectPath>/.a2a/sessions/` directory as JSON files.

**Session Structure:**
```typescript
interface Session {
    id: string;
    projectId: string;
    title: string;
    task?: string;
    status?: string;
    selectedAction?: string;
    context?: Record<string, unknown>;
    lastPromiseId?: string;  // ← promiseId storage
    createdAt: string;
    updatedAt: string;
    messages?: unknown[];
}
```

### Key Functions

#### `updateSessionWithServerResponse(project, session, serverResponse)`
Updates session with data from server response:
- Merges context
- Updates execute information
- Appends messages
- Appends exchange log
- Updates timestamp

#### `updateSessionWithStatusResponse(project, session, statusResponse)`
Similar to above but specifically for status responses.

#### `extractSessionIdFromPath(pathName)`
Extracts session ID from request path for status polling.

### WebSocket Broadcasting

Real-time updates are sent via WebSocket to subscribed clients:

```typescript
function broadcastProgress(sessionId: string, progress: {
    promiseId?: string;
    status: string;
    progress?: number;
    message?: string;
    result?: unknown;
}): void
```

**Broadcast Events:**
- `promise_id_assigned`: When promiseId is assigned
- `server_response_received`: When server response is received
- `status_updated`: When status is updated

## API Endpoints

### POST /api/v1/invoke

**Request:**
```json
{
    "task": "Task description",
    "sessionId": "session-id",
    "projectId": "project-id",
    "context": { /* optional context */ }
}
```

**Response:**
```json
{
    "data": {
        "promiseId": "promise-id"
    }
}
```

**Behavior:**
- Forwards request to Server
- Stores promiseId in session
- Broadcasts promiseId via WebSocket

### POST /api/v1/requests/:id/status

**Request:** None (GET request)

**Response:**
```json
{
    "status": "in_progress",
    "context": { /* updated context */ },
    "execute": { /* current execute */ },
    "messages": [ /* new messages */ ],
    "exchangeLog": [ /* new exchange log entries */ ]
}
```

**Behavior:**
- Forwards request to Server
- Updates session with response data
- Broadcasts status update via WebSocket

### GET /api/v1/sessions/:sessionId

**Response:**
```json
{
    "id": "session-id",
    "projectId": "project-id",
    "title": "Session Title",
    "task": "Task description",
    "status": "in_progress",
    "context": { /* merged context */ },
    "lastPromiseId": "promise-id",
    "messages": [ /* all messages */ ],
    "createdAt": "2026-03-04T04:30:00Z",
    "updatedAt": "2026-03-04T04:35:00Z"
}
```

## Testing

### Test Script

Use the provided test script to verify the promiseId flow:

```bash
cd a2a-client/packages/api-server
node test-promiseid-flow.js
```

**Test Steps:**
1. Creates test project and session
2. Sends invoke request
3. Verifies promiseId is stored in session
4. Polls status (if server is running)
5. Verifies session updates

### Manual Testing

1. **Start Client API Server:**
   ```bash
   cd a2a-client/packages/api-server
   npm run dev
   ```

2. **Create Project and Session:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/projects \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Project"}'
   
   curl -X POST http://localhost:3001/api/v1/sessions \
     -H "Content-Type: application/json" \
     -d '{"projectId": "project-id", "title": "Test Session"}'
   ```

3. **Send Invoke Request:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/invoke \
     -H "Content-Type: application/json" \
     -d '{"task": "Test task", "sessionId": "session-id", "projectId": "project-id"}'
   ```

4. **Check Session:**
   ```bash
   curl http://localhost:3001/api/v1/sessions/session-id?projectId=project-id
   ```

5. **Poll Status (if promiseId exists):**
   ```bash
   curl http://localhost:3001/api/v1/requests/promise-id/status
   ```

## Integration with Web UI

### WebSocket Connection

Web UI connects to WebSocket server for real-time updates:

```javascript
const ws = new WebSocket(`ws://localhost:3002?sessionId=${sessionId}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'progress':
            // Handle progress updates
            break;
        case 'connected':
            // Handle connection confirmation
            break;
    }
};
```

### Session DTO

The Web UI expects session data in the format defined by `SessionDetail` DTO:

```typescript
interface SessionDetail {
    id: string;
    projectId: string;
    title: string;
    task?: string;
    status?: string;
    context?: Record<string, unknown>;
    messages?: unknown[];
    currentExecute?: unknown;
    createdAt: string;
    updatedAt: string;
}
```

## Error Handling

### Missing Server

If the Server is not running:
- Invoke requests will fail with 503
- Status polling will fail
- Session updates will not occur
- WebSocket connections remain active

### Invalid Session

If session doesn't exist:
- 404 errors are returned
- No session updates occur
- WebSocket connections are not affected

### Network Errors

- All HTTP requests use proper error handling
- WebSocket connections handle reconnection
- Session data is persisted to disk

## Performance Considerations

### Session Storage

- Sessions are stored as individual JSON files
- File I/O is async and non-blocking
- Sessions are cached in memory during requests

### WebSocket Broadcasting

- Only clients subscribed to specific sessions receive updates
- Broadcast messages are lightweight
- Connection cleanup on disconnect

### Status Polling

- Clients should implement exponential backoff
- Server responses are cached where possible
- WebSocket updates reduce polling frequency

## Future Enhancements

1. **Session Cleanup**: Implement automatic cleanup of old sessions
2. **Rate Limiting**: Add rate limiting for status polling
3. **Caching**: Implement caching for frequently accessed sessions
4. **Metrics**: Add monitoring and metrics for promiseId flow
5. **Error Recovery**: Implement automatic retry for failed requests