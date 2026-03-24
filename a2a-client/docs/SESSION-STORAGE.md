# Session Storage System

## Overview

The session storage system provides numbered folders that mirror each dialog step. Client API (e.g. port 3001 when running the SDK standalone) persists step files via `step-storage.ts`; see [api-client-server-logic.md](./api-client-server-logic.md). By default the storage directory is `a2a-client/storage/sessions/{sessionId}` (relative to the repo root), but the environment variable `A2A_CLIENT_STORAGE_DIR` can point to another directory (for example `<storageDir>/sessions/`). Persistent storage keeps track of `context`, `execute`, `messages`, step files, and async `promiseId` metadata.

## Storage Structure

### File Format

Sessions are stored under `<storageDir>/sessions/{sessionId}/`, where `<storageDir>` is `A2A_CLIENT_STORAGE_DIR` if set, otherwise the default repo-local `a2a-client/storage`. Each session directory no longer contains a root `session.json`; instead it is composed of per-step numbered folders that carry every request/response artifact:

```
<storageDir>/sessions/
├── sess_1234567890/
│   ├── 1/
│   │   ├── client-result.json
│   │   ├── request-to-server.json
│   │   └── server-response.json  # includes execute/context/messages
│   ├── 2/
│   │   ├── client-result.json
│   │   ├── request-to-server.json
│   │   ├── server-promise.json
│   │   └── server-response.json  # includes execute/context/messages
│   └── 3/
│       └── ...
└── sess_1234567891/
    └── ...
```

**Step file locations (Client API):**

| File | Folder | When |
|------|--------|------|
| `request-to-server.json` | `{N+1}/` | Payload sent to A2A Server for next step |
| `server-promise.json` | `{N+1}/` | Saved when the request returned a promiseId |
| `client-result.json` | `{N}/` | User interaction result (recorded before next step) |
| `server-response.json` | `{N+1}/` | Completed A2A Server response |
| `messages.json` | `{N+1}/` | Step-scoped dialogue slice |

### Step-centric metadata

Since there is no `session.json`, session metadata is reconstructed from the highest-numbered step that already contains `server-response.json`. That file provides the latest `execute`, `context` (including `workbench.sections`), `status`, `result`, and the assistant messages that led to that state. The Client API scans from step `1` up to the current step, appends the `messages` array embedded in each `server-response.json`, merges the recorded user inputs from `client-result.json`, and treats the final `server-response.json` as the source of truth for the dialogue state. This organization ensures that even if a root metadata file is missing, the numbered folders alone carry the full session history.

### server-response.json Format

```json
{
  "step": 1,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stepText": "Concatenated message content for history fetch",
  "execute": { "form": { ... } },
  "context": { "workbench": { "sections": { ... } } },
  "result": { "read-file": { "path": "src/utils.js", "content": "..." } }
}
```

`stepText` stores concatenated message content for requesting history from a specific message number.

### server-response.json carries assistant messages

Each `server-response.json` now stores an ordered `messages` array that mirrors what used to live in `messages.json`:

```json
{
  "execute": { ... },
  "context": { ... },
  "result": { ... },
  "messages": [
    { "role": "assistant", "content": "Hi there!" }
  ]
}
```

The history assembler (`collectSessionMessagesFlat` in the Vite plugin) walks these arrays, dedups the texts, and then appends every user turn from the matching `client-result.json`. Even though there is no standalone `messages.json` anymore in the final state, the folders carry the full dialogue.

**Step flow:** Once a server response lands in step `N`, the client writes `client-result.json` (either from Web UI or an auto script). The upcoming step (`N+1`) receives `request-to-server.json` before the A2A Server call. Synchronous responses land immediately in `{N+1}/server-response.json`; asynchronous responses first record `server-promise.json` in `{N+1}/`, then the completed `server-response.json` in that same folder once the promise finishes. Refer to [api-client-server-logic.md](./api-client-server-logic.md#поток-обработки-шагов-step-flow) for the detailed diagram.

**Simulation standards:** For "golden standard" simulations under `simulations/`, `server-response.json` artifacts are pruned. Instead, each step is defined by `request.json`, `response.json` (server output), and `received.json` (Web DTO).

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
- Sessions stored in `<storageDir>/sessions/` (default `a2a-client/storage/sessions/`)
- Numbered folders for each step (1/, 2/, 3/)
- server-response.json with stepText for history fetch from message number
- Survives page refresh, supports history retrieval

## Usage

### Switching Storage Mode

In the header, use the dropdown to switch between:
- **Project (.a2a)**: Project folder storage
- **Persistent (<storageDir>/sessions/)**: Numbered folder storage (default `a2a-client/storage/sessions/`, override via `A2A_CLIENT_STORAGE_DIR`)

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
