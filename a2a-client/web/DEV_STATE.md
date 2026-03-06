# DEV_STATE - Web UI Component (Port 5173)

## Status

- **State**: Active development (dialog stability + SSE/WS delivery).
- **Focus**: Session/dialog flow, SSE/WebSocket reliability, and front-end performance/security hardening.

## Related Workflows

For detailed workflow documentation covering the current development focus:
- **[Workflows Overview](../docs/workflows/README.md)** - Complete workflow documentation index
- **[Session Lifecycle Scenarios](../docs/workflows/session-lifecycle/)** - Session/dialog flow implementation
- **[Communication Scenarios](../docs/workflows/communication/)** - SSE/WebSocket reliability and fallback mechanisms
- **[Testing Scenarios](../docs/workflows/testing/)** - Validation workflows for current development focus

## Architecture

### Ports
- Web UI (5173), Client HTTP API (3001), SSE endpoint `/api/sse/:sessionId`, WebSocket fallback `/api/ws/:sessionId`.

### Core Components (Unified Architecture - Steps 1-4 Complete)
- `SessionStore` - Single source of truth (consolidated Manager/ViewModel/Sync)
- `TransportManager` - SSE primary → WebSocket auto-fallback (no HTTP polling)
- `PanelManager` - Unified panels + modals (removed 3-level hierarchy)
- `ActionHandler` - Standardized action-key shape for all submissions
- 8 legacy files archived to `js/archive/` and `css/archive/`

### Protocol
All submissions use action-key shape: `{ [actionType]: data }`
- Input types: `choice`, `message`
- Client actions: `script`, `rag-search`, `read-file`, `write-file`, `execute-command`
- Results: All submissions go through `POST /sessions/:id/result`

### Persistence
Session state in SessionStore (max ~200 messages). Panel state by PanelManager.

### Event Flow
`SSE → TransportManager → SessionStore → UI subscribers` (no chains)

## Current File Structure

```
a2a-client/web/
├── js/
│   ├── session-store.js           # Core state (NEW)
│   ├── transport-manager.js       # Unified transport (NEW)
│   ├── session-sync-v2.js         # SSE bridge (NEW)
│   ├── session-store-adapters.js  # Legacy compatibility (NEW)
│   ├── panel-manager.js           # Simplified panels (NEW)
│   ├── task-flow.js               # Updated (no polling)
│   ├── app-task.js                # Application logic
│   ├── api-integration.js         # API layer
│   ├── web-api-client.js          # HTTP client
│   ├── progress-indicators.js     # UI components
│   ├── error-handler.js           # Error handling
│   ├── template-loader.js         # Templates
│   └── archive/                   # Legacy files (archived)
│       ├── session-manager.js
│       ├── session-view-model.js
│       ├── session-sync.js
│       ├── sse-client.js
│       ├── websocket-client.js
│       ├── plasticine-ui.js
│       └── ...
├── css/
│   ├── components/
│   │   └── panel-manager.css      # New panel styles (NEW)
│   └── archive/                   # Legacy CSS
│       ├── panel-cube.css
│       ├── panel-dock.css
│       └── ...
└── index.html                     # Updated script loading
```

## Session State Architecture

### Unified SessionStore

**Location**: `a2a-client/web/js/session-store.js`

Single source of truth consolidating previously fragmented state:

```javascript
// Unified state structure
_state: {
    sessionId,    // string | null
    projectId,    // string | null
    messages[],   // conversation history (max 200)
    execute,      // current execute object (form/message/script)
    context,      // full server context (execution, docVirtual)
    status,       // 'idle' | 'created' | 'active' | 'waiting' | 'completed' | 'error'
    pendingForm,  // form awaiting user input
    lastError     // last error object
}
```

**Benefits**:
- One event emitter chain instead of `SessionManager → TaskFlow → SSE → UI`
- Direct UI subscriptions to store changes
- Computed properties: `isWaitingForInput()`, `getProgress()`, `getCurrentStep()`
- Batch updates via `applyServerResponse()`

**Migration Files**:
- `session-store.js` - Core store implementation
- `session-sync-v2.js` - Direct SSE-to-Store bridge
- `session-store-adapters.js` - Backward-compatible wrappers

**Usage**:
```javascript
// Subscribe to changes
SessionStore.on('execute', (execute) => renderForm(execute));
SessionStore.on('messages', (msgs) => updateChat(msgs));

// Query state
if (SessionStore.isWaitingForInput()) showInputPanel();
const progress = SessionStore.getProgress();
```

## SSE/WebSocket Fallback

### Transport Hierarchy
```
SSE (Primary) → WebSocket (Fallback)
    ↓                    ↓
/api/sse/:sessionId   /api/ws/:sessionId
```

HTTP polling removed from async request flow.

### Old vs New Flow

**Old flow (with polling):**
```
POST /sessions/:id/next → promiseId → GET /requests/:id/status (poll) → GET /requests/:id/result
```

**New flow (SSE only):**
```
POST /sessions/:id/next → await SSE 'execute' event via SessionStore → render
```

### SSE Fallback Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| `EventSource.onerror` | Connection failed, CORS blocked | Switch to WebSocket |
| Network timeout | >30s without heartbeat | WebSocket fallback |
| CORS restrictions | SSE blocked by browser policy | Auto WebSocket |
| Corporate proxy | SSE EventSource filtered | WebSocket attempt |
| Mixed content | HTTP→HTTPS issues | WebSocket secure |
| Firewall rules | Port restrictions | WebSocket alternative |

### TransportManager

**Location**: `a2a-client/web/js/transport-manager.js`

```javascript
// Connect with auto-fallback
TransportManager.connect(sessionId);
// → Tries SSE first
// → Falls back to WebSocket if SSE fails

// Subscribe to events (unified across transports)
TransportManager.on('execute', (data) => render(data));
TransportManager.on('connected', ({ transport }) => console.log(`Using ${transport}`));

// Check state
TransportManager.isConnected(); // true/false
TransportManager.getState(); // { connectionState, activeTransport, sessionId }
```

**Events**: `connecting`, `connected`, `disconnected`, `message`, `execute`, `form`, `progress`, `error`, `transportError`, `reconnecting`

**No polling**: Removed `pollResult` and status/result polling from `task-flow.js`

## Panel System Architecture

### PanelManager (Simplified)

**Location**: `a2a-client/web/js/panel-manager.js`

Unified panel system:

```javascript
// Open/create panel
PanelManager.open('task', {
    id: 'task-flow-panel',
    title: 'Task',
    critical: true  // Can't close, only minimize
});

// Update content
const panel = PanelManager.get('task-flow-panel');
panel.setContent('<div>Loading...</div>');

// State transitions
panel.minimize();   // → indicator visible
panel.restore();    // → visible
panel.close();      // → hidden (non-critical only)
```

**Panel Types**: `task`, `chat`, `logs`, `sessions`, `settings`, `projects`, `debug`

**States**: `created` → `visible` ↔ `minimized` → `closed`

**Key simplifications**:
- Replaced "cubes" with indicators
- Unified panels + modals
- Direct SessionStore integration
- Removed 3-level hierarchy

## Testing Status

Multi-level testing framework:

| Level | Script | Purpose | Status |
|-------|--------|---------|--------|
| 1. AI Integration | `test-ai-integration.ps1` | Proxy + Ollama | ✅ Enabled |
| 2. AI Server | `test-a2a-server.ps1` | API/LLM integrity | ✅ Enabled |
| 3. A2A Client | `test-a2a-client.ps1` | Client API/WebSocket | ✅ Enabled |
| 4. Web UI | `test-web-ui.ps1` + `web-ui-smoke-api.spec.ts` | Full-stack smoke test | ✅ Enabled |
| 5. Load Testing | `sse-load-test.spec.ts` | Concurrent SSE connections | ✅ Enabled |
| 6. Performance | `performance-monitoring.spec.ts` | Heap usage, connection health | ✅ Enabled |
| 7. Parallel Testing | `parallel-browser-test.spec.ts` | Cross-browser matrix | ✅ Enabled |
| 8. Visual Regression | `visual-regression.spec.ts` | Screenshot comparison | ✅ Enabled |

## Web UI Smoke Testing

**Requirements**:
- Docker (PostgreSQL + Redis)
- A2A Server (port 3000)
- Client API proxy (port 3001)
- Vite dev server (port 5173)

**Manual Execution**:
```powershell
.\scripts\test-web-ui.ps1
.\scripts\test-web-ui.ps1 -Browser firefox
.\scripts\test-web-ui.ps1 -SkipBrowser
```

**Automated CI**: `tests/e2e/web-ui-smoke-api.spec.ts`

## Current Priorities

1. **Security & dependencies**: upgrade esbuild/vite, remove console leaks, add CSP/CORS, sanitize inputs
2. **Promise & API integration**: ensure promise status locking + client API exclusivity
3. **SSE reliability & observability**: exponential backoff, single connection per session, sequence numbering
4. **Performance monitoring**: heap usage tracking, connection health metrics, memory leak detection

## References

- `a2a-client/web/README.md` — user-facing entrypoint
- `a2a-client/web/docs/dialog-architecture-tasks.md`
- `a2a-client/web/docs/testing-sse-tasks.md`