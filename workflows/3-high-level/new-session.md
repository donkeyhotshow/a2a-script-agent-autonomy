# New Session Workflow

> **End-to-end flow for creating new session**

## Overview

Complete flow from user clicking "New Session" to session being ready for tasks.

## Flow Diagram

```
User
  ↓ clicks "New Session"
Web UI
  ↓
PanelManager.createPanel('task-panel')
  ↓
TransportManager.send({ type: 'session:create' })
  ↓
API Server (3001)
  ↓
a2a-server: POST /api/sessions
  ↓
Database: INSERT session
  ↓
Response: { sessionId, status }
  ↓
API Server → SSE → Web Client
  ↓
TransportManager.emit('session:created')
  ↓
PanelManager.updatePanel(sessionId)
  ↓
Storage.saveSession(sessionId, data)
  ↓
UI updated with new session
```

## Step-by-Step

### 1. UI Trigger

```javascript
// web/js/app.js or component
newSessionButton.addEventListener('click', async () => {
  // Create panel immediately for responsiveness
  const panel = PanelManager.createPanel({
    id: 'new-session-panel',
    type: 'task',
    title: 'New Session'
  });

  // Send request
  const response = await TransportManager.send({
    type: 'session:create',
    payload: { timestamp: Date.now() }
  });

  // Handle response in event listener
});
```

### 2. Transport Layer

```javascript
// transport-manager.js
async send(message) {
  // Add message ID for tracking
  message.id = generateId();

  // Queue if disconnected
  if (!this.isConnected) {
    this.messageQueue.push(message);
    return { queued: true };
  }

  // Send via active transport
  this.transport.send(message);

  // Return promise that resolves on response
  return this.waitForResponse(message.id);
}
```

### 3. API Server

```javascript
// a2a-client API server routes
app.post('/api/sessions', async (req, res) => {
  // Forward to a2a-server
  const response = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });

  const data = await response.json();

  // Notify connected clients via SSE
  sseManager.emit(data.sessionId, 'session:created', data);

  res.json(data);
});
```

### 4. A2A Server

```javascript
// a2a-server/src/routes/sessions.routes.ts
router.post('/sessions', async (req, res) => {
  // Create session in database
  const session = await prisma.session.create({
    data: {
      id: generateSessionId(),
      status: 'active',
      createdAt: new Date()
    }
  });

  // Return session info
  res.json({
    sessionId: session.id,
    status: 'created',
    timestamp: session.createdAt
  });
});
```

### 5. Response Handling

```javascript
// Web client event handler
TransportManager.on('session:created', (data) => {
  // Update panel with session ID
  PanelManager.updatePanel('new-session-panel', {
    sessionId: data.sessionId,
    status: 'ready'
  });

  // Save to storage
  Storage.saveSession(data.sessionId, {
    id: data.sessionId,
    createdAt: data.timestamp,
    exchanges: []
  });

  // Update UI state
  State.setCurrentSession(data.sessionId);

  // Show notification
  Notifications.show(`Session ${data.sessionId} created`);
});
```

## Error Handling

```javascript
// Timeout
const timeout = setTimeout(() => {
  PanelManager.updatePanel(panelId, {
    status: 'error',
    error: 'Session creation timed out'
  });
}, 30000);

// Error response
TransportManager.on('error', (error) => {
  clearTimeout(timeout);
  PanelManager.updatePanel(panelId, {
    status: 'error',
    error: error.message
  });
});
```

## Testing

```bash
# End-to-end test
npm run test:e2e:new-session

# API test
npm run test:api:sessions
```
