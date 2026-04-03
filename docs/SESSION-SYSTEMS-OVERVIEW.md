# Session Systems Overview

Comprehensive documentation of session-related systems: promises, async processing, UI.

## Architecture Layers

```
Web UI (5173)
  ├─ TaskFlow (render.js)
  ├─ SessionStore (global state)
  └─ WindowState (per-window)
         ↓
Client API (Vite Plugin)
  ├─ Session Routes (GET/POST)
  ├─ Step Routes (/next, /async)
  └─ Step Handlers (file I/O)
         ↓
A2A Server (3000)
  ├─ Invoke Handler (sync/async)
  ├─ Router (dialog/agent)
  └─ Transforms (workbench)
         ↓
AI Integration (11434)
  ├─ Promise Routes (async exec)
  ├─ Daemon (background)
  └─ Ollama (LLM)
```

---

## Promise System (Async LLM Processing)

Long-running LLM requests return `promiseId`. Client polls for completion.

### Flow

```
Client API → A2A Server → AI Integration
  POST /invoke with task
    ↓
  Server returns promiseId (no result yet)
    ↓
  Client polls GET /async (every 2s)
    ↓
  Server checks promise status via AI Integration
    ↓
  When ready: response with execute/context/result
    ↓
  Client renders
```
    │{status:"processing"}    │                           │
    │<──────────────────────────│                           │
    │                           │                           │
    │ ... (poll) ...           │                           │
    │                           │                           │
    │ GET /async               │                           │
    │──────────────────────────>│                           │
    │                           │  GET /promise/prom_xxx/result
    │                           │──────────────────────────>│
    │                           │<──────────────────────────│
    │{execute:{...}, context}  │                           │
    │<──────────────────────────│                           │
```

### Key Files
- `ai-integration/proxy/promise_routes.py` - Promise API endpoints
- `ai-integration/proxy/promises.py` - Promise state management
- `ai-integration/proxy/daemon.py` - Background processing
- `a2a-client/packages/vite-plugin/routes/stepRoutes.js` - `/async` polling

### States
- `pending` - Promise created, not yet processed
- `processing` - Currently executing in daemon
- `completed` - Successfully finished
- `failed` - Error occurred
- `cancelled` - Manually cancelled

---

## 2. Red Room (Client Auto-Response)

### Overview
Когда сервер возвращает `execute` с действием для клиента (например, `read-file`, `script`), клиент автоматически выполняет это действие и отправляет результат обратно.

### Trigger
Сервер возвращает:
```json
{
  "execute": {
    "script": { "code": "...", "input": {}, "output": "..." }
  }
}
```

### Flow

```
Step N                              Step N+1
┌─────────────────────┐            ┌─────────────────────┐
│ server-response.json│            │ client-result.json  │
│ (execute: script)   │            │ (tool output)        │
└─────────┬───────────┘            └──────────┬──────────┘
          │                                  │
          ▼                                  ▼
    ┌─────────────────────────────────────────────┐
    │ Client Action:                              │
    │ 1. Execute tool (read-file, script, etc.)  │
    │ 2. Save result to client-result.json       │
    │ 3. POST /next with result                  │
    └─────────────────────────────────────────────┘
                      │
                      ▼
              ┌──────────────────┐
              │ server-response  │
              │ (final step)     │
              └──────────────────┘
```

### Required Cycle (From RED-ROOM.md)
1. Save result in next step as `client-result.json`
2. Build `request-to-server.json` using previous context + new result
3. Call `POST /api/a2a/sessions/{id}/next`
4. If ack reports `asyncPending=true`, poll `GET /api/a2a/sessions/{id}/async`
5. Finalize the same step with `server-response.json` (+ `messages.json`)

### Key Files
- `a2a-client/docs/RED-ROOM.md` - Full specification
- `a2a-client/web/js/action-executor.js` - Tool execution
- `a2a-client/packages/vite-plugin/routes/stepRoutes.js` - Step persistence

---

## 3. Gray Room (Server-Only Chain)

### Overview
Сервер выполняет несколько внутренних шагов (LLM → transform → LLM) без участия клиента. Клиент получает только финальный результат.

### Contrast with Red Room

| | Red Room | Gray Room |
|---|----------|-----------|
| **Where** | Client + Client API | A2A server only |
| **Trigger** | Server returns tool `execute` | Response transform emits `interrupt` |
| **Extra HTTP** | Yes — auto `client-result` + `/next` | No — one outward response |
| **Artifacts** | Step folders (`client-result.json`) | Same one logical step |

### Supported Reasons (from GRAY-ROOM.md)
- `thinking` - Store reasoning in `workbench.slots.thinking`, call LLM again
- `compress_history` - Summarize long history with LLM
- `auto_rag_page` - Paginated RAG search
- `auto_read_file` - Read file via workspace handler
- `clarify` - Store clarification request

### Flow

```
Invoke Request
      │
      ▼
┌─────────────────────────────────────────┐
│  LLM (main)                             │
│  Returns: { interrupt: { reason: "thinking" } }
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Gray Room Handler                      │
│  - Update workbench.slots.thinking      │
│  - Rebuild request.md                   │
│  - Call LLM again                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Response Transform                     │
│  - No interrupt → Final result          │
│  - Optional: interruptTrace in context │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        Final Client Response
```

### Key Files
- `a2a-client/docs/GRAY-ROOM.md` - Client view
- `a2a-server/docs/GRAY-ROOM.md` - Server specification
- `a2a-server/src/transform/types.ts` - Interrupt types

---

## 4. Agent Mode (Workbench System)

### Overview
Agent mode использует `workbench` для хранения структурированного состояния между вызовами. Это позволяет LLM сохранять контекст и состояние между шагами.

### Workbench Structure

```typescript
interface Workbench {
  sections?: {
    [sectionName: string]: any;  // Named sections (code, files, analysis, etc.)
  };
  batch?: {
    items?: any[];
    currentIndex?: number;
  };
  slots?: {
    // Interrupt-specific data
    thinking?: string;
    clarify?: any;
    interruptTrace?: ServerInterruptTraceEvent[];
  };
}
```

### Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Request Prep                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Attach flowControlHint (action + step)            │ │
│  │ 2. Normalize workbench (attachWorkbenchForLlmPrompt) │ │
│  │ 3. Merge workbench into template context              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  LLM Processing                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ LLM may emit:                                         │ │
│  │ - workbench.sections (bulk update)                    │ │
│  │ - workbench_ops (incremental: set/append/remove)     │ │
│  │ - interrupt (gray room trigger)                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Response Transform                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. merge-workbench-sections: LLM → context.workbench  │ │
│  │ 2. apply-workbench_section_ops: apply workbench_ops    │ │
│  │ 3. (If interrupt) → Gray Room loop                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
                    Persisted to session
```

### Key Files
- `a2a-server/prompts/auto-ai-request.md` - Auto-AI prompt
- `a2a-server/prompts/coder-request.md` - Coder prompt
- `a2a-server/docs/LLM-REQUEST-PREP.md` - Workbench integration
- `a2a-server/docs/TRANSFORM-OPS.md` - Transform operations

---

## 5. UI Updates (Dialog Sections)

### Overview
Web UI отображает состояние сессии, включая workbench sections, через динамические обновления.

### Render Flow

```
Server Response
      │
      ▼
┌─────────────────────────────────────────┐
│  apiIntegration.getSession()           │
│  - Uses projected DTO                   │
│  - includeContext: false (default)      │
│  - execute.message / execute.form       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  SessionStore                           │
│  - setExecute(execute)                  │
│  - setContext(context)                   │
│  - pushMessage(msg)                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Event: 'execute' / 'context'           │
│  → TaskFlow subscribers                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Render.renderExecute()                │
│  - buildWorkbenchSectionsHtml(context) │
│  - render message history              │
│  - render form (if present)             │
└─────────────────────────────────────────┘
```

### Workbench Sections Rendering

```javascript
// From render.js
function buildWorkbenchSectionsHtml(context) {
    const sections = context?.workbench?.sections;
    if (!sections) return '';
    
    // Render each section as structured data
    for (const [sectionName, sectionData] of Object.entries(sections)) {
        // Display: code, files, analysis, etc.
    }
}
```

### Key Files
- `a2a-client/web/js/task-flow/render.js` - UI rendering
- `a2a-client/web/js/session-store.js` - State management
- `a2a-client/web/js/task-flow/tasks.js` - Task execution

---

## 6. Session Storage

### Overview
Сессии хранятся как файловые артефакты в step-папках.

### Directory Structure

```
storage/sessions/{sessionId}/
├── 1/
│   ├── client-result.json      # User/tool result for step 1
│   ├── request-to-server.json  # Request sent to A2A server
│   ├── server-response.json    # Final response (execute + context)
│   └── messages.json          # Message slice for step 1
├── 2/
│   ├── client-result.json
│   ├── request-to-server.json
│   ├── server-response.json
│   ├── server-promise.json    # Async state (if pending)
│   └── messages.json
└── ...
```

### Source of Truth Rules
1. Highest step with `server-response.json` = current state
2. Session state rebuilt from step files (not root session file)
3. `server-promise.json` exists only while async work is pending

### Key Files
- `a2a-client/docs/SESSION-STORAGE.md` - Full specification
- `a2a-client/packages/vite-plugin/routes/handlers/step-handlers.js` - File I/O

---

## 7. Integration Points

### How All Systems Connect

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER ACTION                             │
│  User types message or selects choice                           │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      CLIENT (WEB UI)                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. SessionStore.createSessionWithForm() / sendMessage()  │ │
│  │ 2. POST /api/a2a/sessions/{id}/next                       │ │
│  │ 3. If asyncPending → poll /async                         │ │
│  │ 4. Restore execute + context to SessionStore              │ │
│  │ 5. Render.renderExecute() → UI update                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT API (Vite)                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Persist request-to-server.json                         │ │
│  │ 2. Forward to A2A Server                                   │ │
│  │ 3. Persist server-response.json                           │ │
│  │ 4. Return projected DTO (no internal context by default) │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       A2A SERVER                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Route (dialog/agent/task-decomposition)                 │ │
│  │ 2. Request prep (flowControlHint, workbench)              │ │
│  │ 3. If async → return promiseId                            │ │
│  │ 4. Call AI Integration                                    │ │
│  │ 5. Response transform (merge workbench, apply ops)       │ │
│  │ 6. If interrupt → Gray Room loop                           │ │
│  │ 7. Return execute + context                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AI INTEGRATION                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Create promise                                          │ │
│  │ 2. Daemon processes in background                         │ │
│  │ 3. Call Ollama for LLM                                    │ │
│  │ 4. Return result (completed/processing/failed)           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Async Flow (Long-Running)

```
Client                    Client API           A2A Server           AI Integration
   │                          │                     │                      │
   │ POST /next               │                     │                      │
   │─────────────────────────>│                     │                      │
   │                          │ POST /invoke        │                      │
   │                          │────────────────────>│                      │
   │                          │                     │ POST /prompt         │
   │                          │                     │─────────────────────>│
   │                          │                     │<─────────────────────│
   │                          │ {promiseId}         │                      │
   │                          │<────────────────────│                      │
   │ {asyncPending: true}    │                     │                      │
   │<─────────────────────────│                     │                      │
   │                          │                     │                      │
   │ GET /async              │                     │                      │
   │─────────────────────────>│                     │                      │
   │                          │                     │ GET /promise/.../status
   │                          │                     │──────────────────────>│
   │                          │                     │ {status: "processing"}
   │ {status: processing}   │                     │<──────────────────────│
   │<─────────────────────────│                     │                      │
   │                          │                     │                      │
   │ ... (poll) ...          │                     │                      │
   │                          │                     │                      │
   │ GET /async              │                     │                      │
   │─────────────────────────>│                     │                      │
   │                          │                     │ GET /promise/.../result
   │                          │                     │──────────────────────>│
   │                          │                     │ {execute, context}   │
   │                          │                     │<──────────────────────│
   │                          │ {execute, context} │                      │
   │                          │<────────────────────│                      │
   │ {execute: {...}}         │                     │                      │
   │<─────────────────────────│                     │                      │
```

### Red Room Flow (Tool Execution)

```
Server Response                     Client Action
{execute: {script: ...}}            1. Run tool
      │                             2. client-result.json
      │                             3. POST /next
      ▼                            
┌─────────────────────────┐        ┌─────────────────────────┐
│ ActionExecutor.submit() │───────>│ Tool Output             │
│ - Check execute type    │        │ POST /sessions/:id/next │
│ - If tool → execute    │        └─────────────────────────┘
└─────────────────────────┘                   │
                                            ▼
                                    ┌─────────────────────────┐
                                    │ Server Response        │
                                    │ (final step state)     │
                                    └─────────────────────────┘
```

---

## Execution mode parity (script / dialog / agent)

One **action key** per `execute` and per `result` ([`AGENTS.md`](../AGENTS.md)). Operators and goldens should treat **script** as first-class alongside dialog and agent:

| Concern | Script | Dialog | Agent |
|--------|--------|--------|-------|
| **execute** | Same rule: one key (`form`, `script`, `run-script`, `execute-command`, `message`, …). Router uses `execute.form.choices` like other modes. | `form`, `message`, … | Tools + `form` / `message` |
| **result** | `result.script`, `result.run-script`, `result.execute-command`, `result.choice`, `result.message` — one key per turn. | `result.message`, `result.choice` | Tool results + `message` / `choice` |
| **context.history** | Can accumulate rows compatible with agent shape (`role`, `message`, optional `step` / `action`). Reference: `simulations/sync/script/` steps 4–10. | Per user/assistant turns | Tool loop |
| **context.workbench** | Same `sections` / `slots` model; script goldens include non-empty `sections` mid-chain where parity matters. | Same | Same (+ gray-room `slots` in some flows) |
| **Web DTO / received.json** | `buildWebExecute` strips client-only keys; pending script may surface as `attachments.pendingClientAction`. | Same sanitizer | Same |
| **Session storage** | Steps under `a2a-client/storage/sessions/`; rebuild from highest step with `server-response.json`. | Same | Same |

**E2E smoke:** `scripts/e2e-client-api-replay-sync-script.mjs` replays Client API `client.json` bodies (sync script path).

---

## 8. Key Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | A2A Server port |
| `SKIP_AUTH` | - | Bypass auth in dev |
| `ENCRYPTION_KEY` | required | 32-char key |
| `DEFAULT_SYNC_MODE` | - | Set to 1 for sync responses |
| `A2A_MAX_INTERRUPT_TURNS` | 10 | Gray room budget |
| `A2A_COMPRESS_HISTORY_MIN_ENTRIES` | 0 | Skip compression threshold |

### Query Parameters

| Parameter | Usage |
|-----------|-------|
| `includeContext=1` | Return full canonical context (debug only) |
| `projectId` | Filter sessions by project |

---

## Related Documentation

- [session-management-protocols.md](a2a-client/docs/session-management-protocols.md)
- [SESSION-STORAGE.md](a2a-client/docs/SESSION-STORAGE.md)
- [WEB_UI_PROTOCOL.md](a2a-client/docs/WEB_UI_PROTOCOL.md)
- [RED-ROOM.md](a2a-client/docs/RED-ROOM.md)
- [GRAY-ROOM.md](a2a-client/docs/GRAY-ROOM.md)
- [AGENTS.md](AGENTS.md) - Full protocol details