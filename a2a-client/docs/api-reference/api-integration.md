# APIIntegration API Reference

The APIIntegration module connects UI components with the Client API, handling HTTP communication for sessions, projects, and async operations.

## Overview

```javascript
const api = new APIIntegration();
// Configure base URL
api.setApiBase('http://localhost:3001/api');
// Make requests
const sessions = await api.getSessions();
```

## Initialization

### `new APIIntegration()`

Creates a new APIIntegration instance.

```javascript
const api = new APIIntegration();
```

---

## Methods

### `api.setApiBase(baseUrl)`

Set the Client API base URL.

**Parameters:**
- `baseUrl` (string): Base URL (e.g., 'http://localhost:3001/api' or '/api')

---

### `api.setToken(token)`

Set authentication token.

**Parameters:**
- `token` (string): JWT token

---

### `api.getProjects()`

Get all projects.

**Returns:** `Promise<Object[]>` - Array of projects

---

### `api.getProject(projectId)`

Get project by ID.

**Parameters:**
- `projectId` (string): Project identifier

**Returns:** `Promise<Object>` - Project object

---

### `api.createSession(sessionData)`

Create new session.

**Parameters:**
- `sessionData` (Object): Session configuration

**Returns:** `Promise<Object>` - Created session

---

### `api.getSessions()`

Get all sessions.

**Returns:** `Promise<Object[]>` - Array of sessions

---

### `api.getSession(sessionId)`

Get session by ID.

**Parameters:**
- `sessionId` (string): Session identifier

**Returns:** `Promise<Object>` - Session object

---

### `api.sendMessage(sessionId, message)`

Send message to session.

**Parameters:**
- `sessionId` (string): Session identifier
- `message` (string): Message content

**Returns:** `Promise<Object>` - Server response with promiseId or execute

---

### `api.sendChoice(sessionId, choiceId, choiceData)`

Send choice selection (for forms/routing).

**Parameters:**
- `sessionId` (string): Session identifier
- `choiceId` (string): Choice identifier
- `choiceData` (Object): Choice data

**Returns:** `Promise<Object>` - Server response

---

### `api.pollAsync(sessionId)`

Poll for async operation result.

**Parameters:**
- `sessionId` (string): Session identifier

**Returns:** `Promise<Object>` - Async result or null if still pending

---

### `api.getPromiseResult(promiseId)`

Poll for promise result by ID (legacy).

**Parameters:**
- `promiseId` (string): Promise identifier

**Returns:** `Promise<Object>` - Promise result

---

## Transport Note

> **Note**: This replaces the planned `TransportManager`. SSE/WebSocket transport was removed in favor of simple HTTP polling via `GET /api/a2a/sessions/:id/async`.

See [TransportManager (deprecated)](transport-manager.md) for the old planned specification.

## Related

- [session-store.md](session-store.md) - Client-side session state
- [window-registry.md](window-registry.md) - Session window management