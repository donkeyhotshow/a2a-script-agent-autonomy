# Session Storage System

## Overview

The session storage system provides persistent storage for dialog sessions using numbered folders. Client API (port 3001) persists step files via `step-storage.ts`; see [api-client-server-logic.md](../../plans/api-client-server-logic.md). This allows for better session management, history tracking, and the ability to resume sessions from a specific message number.

## Storage Structure

### File Format

Sessions are stored in: `~/.a2a-client/sessions/{sessionId}/` (override via `A2A_CLIENT_STORAGE_DIR`)

```
~/.a2a-client/sessions/
├── sess_1234567890/
│   ├── session.json          # Session metadata
│   ├── 1/                    # Step 1 (initial form input)
│   │   ├── server-response.json   # Server response (execute, context)
│   │   ├── messages.json          # Chat messages (role, content)
│   │   ├── client-result.json     # Client result (from form submit)
│   │   └── request-to-server.json # Request payload (before server call)
│   ├── 2/
│   │   ├── server-promise.json    # Async promise (from step 1 request)
│   │   ├── server-response.json
│   │   └── messages.json
│   └── 3/
│       └── ...
└── sess_1234567891/
    └── ...
```

**Step file locations (Client API):**

| File | Folder | When |
|------|--------|------|
| `request-to-server.json` | `{N}/` | Before server request |
| `server-promise.json` | `{N+1}/` | After async request (promiseId) |
| `client-result.json` | `{N}/` | After client form submit |
| `server-response.json` | `{N}/` | After server response |

### session.json Format

```json
{
  "id": "sess_1234567890",
  "title": "My Session",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z",
  "status": "active",
  "currentStep": 3,
  "execute": { ... },
  "context": { ... }
}
```

### server-response.json Format

```json
{
  "step": 1,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stepText": "Concatenated message content for history fetch",
  "execute": { ... },
  "context": { ... },
  "result": { ... }
}
```

`stepText` stores concatenated message content for requesting history from a specific message number.

### messages.json Format

Messages are stored in a separate file for clarity and easier updates:

```json
[
  {"role": "user", "content": "Hello"},
  {"role": "assistant", "content": "Hi there!"}
]
```

When loading a step, the API merges `messages.json` into the step response.

**Step flow:** After `server-response.json`, get `client-result.json` (from Web client or auto), build `request-to-server.json`, send to server. Async: save `server-promise.json` in `{N+1}/`; when complete, save `server-response.json` in `{N+1}/`.

## API Endpoints

### Sessions API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/a2a/sessions` | List all sessions |
| POST | `/api/a2a/sessions` | Create new session with form input |
| GET | `/api/a2a/sessions/:id` | Get session metadata |
| PUT | `/api/a2a/sessions/:id` | Update session |
| DELETE | `/api/a2a/sessions/:id` | Delete session |

### Steps API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/a2a/sessions/:id/steps` | List all steps |
| GET | `/api/a2a/sessions/:id/steps/:n` | Get specific step |
| POST | `/api/a2a/sessions/:id/steps` | Create new step |

### History API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/a2a/sessions/:id/latest` | Get latest step (for polling) |
| GET | `/api/a2a/sessions/:id/history/:from` | Get history from step |

## Storage Modes

### Project Mode (.a2a)
- Sessions stored in project folder: `{projectPath}/.a2a/sessions/`
- Single JSON file per session (legacy format)
- Uses first project from storage/projects.json

### Storage Mode (Persistent)
- Sessions stored in `~/.a2a-client/sessions/`
- Numbered folders for each step (1/, 2/, 3/)
- server-response.json with stepText for history fetch from message number
- Survives page refresh, supports history retrieval

## Usage

### Switching Storage Mode

In the header, use the dropdown to switch between:
- **Project (.a2a)**: Project folder storage
- **Persistent (~/.a2a-client/sessions)**: Numbered folder storage

The setting is persisted in localStorage under `a2a_storage_mode`.
Client sends `X-Storage-Mode: project|storage` header. Default: storage.

### Creating a Session

When creating a new session in Storage mode, the system automatically:
1. Creates the session directory
2. Adds Step 1 with execute form input for task entry
3. Returns the session with initial execute

### Auto-Responses

When the server sends execute commands that don't require user input (no `form.input` or `form.choices`), the system:
1. Creates automatic system messages
2. Emits `autoContinue` event for UI handling
3. Can auto-continue processing without user intervention

Types of auto-responses:
- `auto-action`: Server executing an action
- `auto-script`: Server running a script
- `auto-result`: Server returning a result

## JavaScript API

### SessionStore Methods

```javascript
// Set storage mode
SessionStore.setStorageMode('storage'); // 'project' or 'storage'

// Get current mode
const mode = SessionStore.getStorageMode();

// Check if using persistent storage
const isPersistent = SessionStore.isPersistentStorage();

// Create session with form
const session = await SessionStore.createSessionWithForm('My Task');

// Save step
await SessionStore.saveStep({ execute, messages, context });

// Load session
await SessionStore.loadSession('sess_123');

// Check latest step (for polling)
const latest = await SessionStore.checkLatestStep();

// Get history from step
const history = await SessionStore.getHistory(5);

// List all sessions
const sessions = await SessionStore.listSessions();

// Get current step
const step = SessionStore.getCurrentStep();
```

### SessionStorage API

```javascript
// List all sessions
const sessions = await SessionStorageAPI.listSessions();

// Create session
const session = await SessionStorageAPI.createSession('Title');

// Get session
const session = await SessionStorageAPI.getSession('sess_123');

// Update session
await SessionStorageAPI.updateSession('sess_123', { title: 'New Title' });

// Delete session
await SessionStorageAPI.deleteSession('sess_123');

// List steps
const steps = await SessionStorageAPI.listSteps('sess_123');

// Get step
const step = await SessionStorageAPI.getStep('sess_123', 2);

// Create step
await SessionStorageAPI.createStep('sess_123', { execute, messages });

// Get latest
const latest = await SessionStorageAPI.getLatest('sess_123');

// Get history
const history = await SessionStorageAPI.getHistory('sess_123', 3);
```

## Events

| Event | Description |
|-------|-------------|
| `sessionCreated` | New session created |
| `sessionLoaded` | Session loaded from storage |
| `storageMode` | Storage mode changed |
| `promisePending` | Waiting for server response |
| `wait` | Wait indicator active |
| `autoContinue` | Auto-response without user input |
| `execute` | Execute command received |
| `message` | New message added |
| `status` | Session status changed |

## UI Components

### Header Storage Toggle
- Located in header center
- Dropdown to select Memory/Persistent mode
- Shows current mode

### Loader Indicator
- Shows when waiting for server response
- Displays "Processing..." text
- Hidden when response received

### Session Step Indicator
- Shows current step number
- Format: "Step X"
