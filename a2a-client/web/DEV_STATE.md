# a2a-client/web DEV_STATE

> Web UI (port 5173) overview — distilled reference for the Web component. Last update: 2026-03-06.

## Status

- **State**: Active development (dialog stability + SSE/WS delivery).
- **Focus**: Session/dialog flow, SSE/WebSocket reliability, and front-end performance/security hardening.

## Architecture highlights

- **Ports**: Web UI (5173), Client HTTP API (3001), SSE endpoint `/api/sse/:sessionId`, WebSocket fallback `/api/ws/:sessionId`.
- **Core moving parts**: 
  - `SessionStore` - Single source of truth for session state
  - `TransportManager` - SSE primary with WebSocket auto-fallback
  - `PanelManager` - Unified panel/modal system
  - Legacy files archived to `js/archive/` and `css/archive/`
- **Protocol**: Uses action-key shaped executes (forms, messages, scripts, rag-search, read/write, execute-command, finalResult) and relies on `context.execution` bookkeeping.
- **Persistence**: Session state persists via SessionStore (max ~200 messages + execute metadata). Panel layouts managed by PanelManager.
- **Monitoring**: Performance metrics via SessionStore state and TransportManager connection health.

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

### Unified SessionStore (New)

**Location**: `a2a-client/web/js/session-store.js`

The SessionStore provides a **single source of truth** for all session-related state, consolidating previously fragmented state across SessionManager, SessionViewModel, and SessionSync:

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
- `session-store-adapters.js` - Backward-compatible wrappers for legacy code

**Usage**:
```javascript
// Subscribe to changes
SessionStore.on('execute', (execute) => renderForm(execute));
SessionStore.on('messages', (msgs) => updateChat(msgs));

// Query state
if (SessionStore.isWaitingForInput()) showInputPanel();
const progress = SessionStore.getProgress();
```

For the deep technical narrative (component responsibilities, execute/event anatomy, SSE design, risk mitigation, TODOs, and performance/security plans) see the task documents in `a2a-client/web/docs/`.

## Task documents

- `docs/dialog-architecture-tasks.md` — session lifecycle, execute mapping, SSE/WebSocket failover, Plasticine UI scenarios, message normalization, and context reconciliation decisions.
- `docs/testing-sse-tasks.md` — Web UI smoke script, Playwright cross-browser matrix, VueFlow coverage, SSE heartbeat/load/order tests, WebSocket fallback automation, API error handling, and SSE load testing implementation.

## Testing status

Testing is layered through the integration stack; the Web UI layer depends on the previous levels.

| Level | Script | Purpose | Status |
|-------|--------|---------|--------|
| 1. AI Integration | `test-ai-integration.ps1` | Proxy + Ollama | ✅ Enabled |
| 2. AI Server | `test-a2a-server.ps1` | API/LLM integrity | ✅ Enabled |
| 3. A2A Client | `test-a2a-client.ps1` | Client API/WebSocket | ✅ Enabled |
| 4. Web UI | `test-web-ui.ps1` + `web-ui-smoke-api.spec.ts` | Full-stack smoke test | ✅ Enabled (manual: `../../scripts/test-web-ui.ps1`, automated: `tests/e2e/web-ui-smoke-api.spec.ts`) |
| 5. Load Testing | `sse-load-test.spec.ts` | Concurrent SSE connections | ✅ Enabled (Playwright: `tests/e2e/sse-load-test.spec.ts`) |
| 6. Performance | `performance-monitoring.spec.ts` | Heap usage, connection health | ✅ Enabled (Playwright: `tests/e2e/performance-monitoring.spec.ts`) |
| 7. Parallel Testing | `parallel-browser-test.spec.ts` | Cross-browser matrix testing | ✅ Enabled (Playwright: `tests/e2e/parallel-browser-test.spec.ts`) |
| 8. Visual Regression | `visual-regression.spec.ts` | Screenshot comparison testing | ✅ Enabled (Playwright: `tests/e2e/visual-regression.spec.ts`) |

### Level 4: Web UI Smoke Testing

**Purpose**: End-to-end verification of the complete Web UI stack including infrastructure, services, browser compatibility, and SSE connectivity.

**Required Services**:
- Docker (PostgreSQL + Redis)
- A2A Server (port 3000)
- Client API proxy (port 3001)
- Vite dev server (port 5173)

**Manual Execution** (`scripts/test-web-ui.ps1`):
```powershell
# Basic smoke test with browser
.\scripts\test-web-ui.ps1

# Cross-browser testing
.\scripts\test-web-ui.ps1 -Browser firefox
.\scripts\test-web-ui.ps1 -Browser edge

# Headless mode for CI automation
.\scripts\test-web-ui.ps1 -SkipBrowser
```

**Manual Validation Steps**:
1. Verify page loads without console errors
2. Confirm session panel appears in UI
3. Check SSE connection establishes (Network tab: `/api/sse/:sessionId`)
4. Validate no WebSocket fallback unless SSE blocked

**Automated CI Counterpart** (`tests/e2e/web-ui-smoke-api.spec.ts`):
- Health endpoint validation (`/health` on all services)
- SSE connectivity testing (`/api/sse/:sessionId`)
- Session creation via API without browser
- CORS header validation for browser SSE

**Artifacts**:
- Service logs collected to `proxy_logs/web-ui-smoke-{timestamp}/`
- Test results in `test-results/web-ui-smoke-{timestamp}.json`
- Browser screenshots/videos on failure

**When to Run**: Before releases, after infrastructure changes, when SSE/WebSocket issues reported.

See `docs/tasks/testing-sse-tasks.md` for detailed procedures, log examples, and troubleshooting.

## SSE/WebSocket Fallback Documentation

### Transport Hierarchy (Updated)

```
SSE (Primary) → WebSocket (Fallback)
    ↓                    ↓
/api/sse/:sessionId   /api/ws/:sessionId
```

**HTTP polling removed** from async request flow. All async responses now come through SSE/WebSocket via SessionStore events.

**Old flow (with polling):**
```
POST /sessions/:id/next → promiseId → GET /requests/:id/status (poll) → GET /requests/:id/result
```

**New flow (SSE only):**
```
POST /sessions/:id/next → await SSE 'execute' event via SessionStore → render
```

### SSE Fallback Triggers

| Trigger | Condition | Implementation | Action |
|---------|-----------|----------------|--------|
| `EventSource.onerror` | Connection failed, CORS blocked, network error | `sse-client.js:121` | Switch to WebSocket |
| Network timeout | >30s without heartbeat | `sse-client.js:heartbeat` | WebSocket fallback |
| CORS restrictions | SSE blocked by browser policy | Browser-level restriction | Auto WebSocket |
| Corporate proxy | SSE EventSource filtered | Network-level blocking | WebSocket attempt |
| Mixed content | HTTP→HTTPS upgrade issues | Protocol mismatch | WebSocket secure |
| Firewall rules | Port restrictions | Network filtering | WebSocket alternative |

### WebSocketClient States & Behavior

#### Connection States
```javascript
// From websocket-client.js
_connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
```

#### Connection Flow
```javascript
SessionManager.setActiveSession(sessionId)
    ↓
SSEClient.connect(sessionId) [PRIMARY]
    ├── EventSource('/api/sse/:sessionId')
    ├── onopen → success
    └── onerror → WebSocketClient.connect(sessionId) [FALLBACK]
        ├── new WebSocket('/api/ws/:sessionId')
        ├── onopen → success
        └── onerror → retry with backoff
```

#### Reconnection Logic
```javascript
// Exponential backoff: delay = baseDelay * 2^(attempts-1)
maxReconnectAttempts: 5
reconnectDelay: 3000ms (base)
heartbeatInterval: 30000ms
```

### Endpoint Specifications

#### SSE Endpoint (Primary)
- **URL**: `/api/sse/:sessionId`
- **Auth**: Token in query params `?token=...`
- **Protocol**: HTTP/1.1 with `text/event-stream`
- **Heartbeat**: 30-second intervals
- **Events**: `connected`, `log`, `progress`, `status`, `task_response`, `action_proposal`, `action_executing`, `step_result`, `complete`, `error`, `session_update`, `node_added`, `node_updated`, `edge_added`

#### WebSocket Endpoint (Fallback)
- **URL**: `ws://localhost:3000/api/ws/:sessionId` or `wss://...`
- **Auth**: Token in connection headers
- **Protocol**: WebSocket with JSON messages
- **Heartbeat**: 30-second ping/pong
- **Message Queue**: Failed messages queued (max 100)

### Network Failure Scenarios

#### Scenario 1: Corporate Firewall Blocks SSE
```
SSE Connection Attempt
    ↓ [CORS/Network Error]
EventSource.onerror triggered
    ↓
WebSocket Fallback Activated
    ├── WebSocket.connect('/api/ws/:sessionId')
    └── [SUCCESS] WebSocket active
```

#### Scenario 2: WebSocket Port Blocked
```
SSE → WebSocket Fallback Attempt
    ↓ [Port 80/443 filtered]
WebSocket.onerror triggered
    ↓
Future: HTTP Polling Fallback
    └── [SUCCESS] Polling active
```

#### Scenario 3: Temporary Network Glitch
```
Active SSE/WebSocket Connection
    ↓ [Network interruption]
Connection.onclose (code != 1000)
    ↓
Exponential backoff reconnection
    ├── Attempt 1: 3s delay
    ├── Attempt 2: 6s delay
    ├── Attempt 3: 12s delay
    └── [SUCCESS] Reconnected
```

### Resource Management & Limits

#### Connection Limits
| Transport | Max Reconnect | Base Delay | Heartbeat | Message Buffer |
|-----------|---------------|------------|-----------|----------------|
| SSE | 5 attempts | 3s | 30s | Unlimited |
| WebSocket | 5 attempts | 3s | 30s | 100 messages |

#### Cleanup on Session Switch
```javascript
SessionManager.setActiveSession(newSessionId)
    ├── SSEClient.disconnect() [close EventSource]
    ├── WebSocketClient.disconnect() [close WebSocket]
    └── Clear message queues
```

### Testing Coverage

#### Automated Tests
- **Fallback Detection**: `tests/e2e/websocket-fallback.spec.ts` - Simulates SSE blocking and verifies WebSocket activation
- **Message Continuity**: Tests ensure messages flow correctly during transport switches
- **Session Persistence**: Layouts and execution context preserved across reconnections
- **Network Interruption**: Graceful handling of temporary connectivity loss
- **Performance**: Memory usage and DOM node limits during fallback stress testing

#### Manual Verification Steps
1. ✅ SSE connection establishes (Network tab: `/api/sse/:sessionId`)
2. ✅ No WebSocket fallback unless SSE blocked
3. ✅ Transport switch maintains message order
4. ✅ Session state persists across reconnections

### Implementation References

#### Core Components
- **TransportManager**: `a2a-client/web/js/transport-manager.js` - Unified SSE/WebSocket with auto-fallback
- **SessionStore**: `a2a-client/web/js/session-store.js` - Unified state management
- **SessionSyncV2**: `a2a-client/web/js/session-sync-v2.js` - SSE-to-Store bridge
- **PanelManager**: `a2a-client/web/js/panel-manager.js` - Simplified panel system
- **Legacy Archive**: `a2a-client/web/js/archive/` - Old files (session-manager.js, sse-client.js, plasticine-ui.js, etc.)

### TransportManager

**Location**: `a2a-client/web/js/transport-manager.js`

Unified transport layer with automatic fallback:

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

**Events emitted**: `connecting`, `connected`, `disconnected`, `message`, `execute`, `form`, `progress`, `error`, `transportError`, `reconnecting`

**No polling**: Removed `pollResult` and status/result polling from `task-flow.js`

#### Configuration
- Heartbeat intervals: 30 seconds (both transports)
- Reconnection attempts: 5 max (configurable)
- Backoff multiplier: 2x per attempt
- Message queue limit: 100 (WebSocket only)

## Panel System Architecture

### PanelManager (New - Simplified)

**Location**: `a2a-client/web/js/panel-manager.js`

Unified panel system consolidating PlasticineUI panels + cubes + modals:

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
- Replaced "cubes" with simplified indicators
- Unified panels + modals in one system
- Direct SessionStore integration (no event chains)
- Removed 3-level hierarchy (panels → cubes → modals)

### Legacy Compatibility

```javascript
// PlasticineUI.addPanel() is adapted to PanelManager
PlasticineUI.addPanel({ id: 'task-flow-panel', ... })
// → calls PanelManager.addPanel() internally
```

## Current priorities

1. **Security & dependencies**: upgrade esbuild/vite, remove console leaks, add CSP/CORS, sanitize inputs (see `dialog-architecture`/`testing-sse` docs for current handling).
2. **Promise & API integration**: ensure promise status locking + client API exclusivity across `api-integration.js`, `web-api-client.js`, WebSocket helpers.
3. **SSE reliability & observability**: exponential backoff, single connection per session, sequence numbering, visibility API cleanup, instrumentation for SSE/WebSocket (see `testing-sse` doc).
4. **Performance monitoring**: heap usage tracking, connection health metrics, memory leak detection, performance regression testing (implemented via `performance-monitoring.spec.ts`).

## References

- `a2a-client/web/README.md` — user-facing entrypoint + README-level architecture.
- `a2a-client/web/docs/dialog-architecture-tasks.md`
- `a2a-client/web/docs/testing-sse-tasks.md`
- Old reference material moved to `a2a-client/web/docs/archive/` – keep there for historical context.
