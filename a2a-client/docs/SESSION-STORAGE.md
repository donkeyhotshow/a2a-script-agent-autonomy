# Session Storage (Current Contract)

Sessions are step-based filesystem artifacts under:

`a2a-client/storage/sessions/{sessionId}/{step}/`

---

## Step-Folder Invariants

Each step folder `storage/sessions/{sessionId}/{step}/` MUST contain exactly one of the following state pairs:

### 1. Finalized Step (with `server-response.json`)

| File | Required | Description |
|------|----------|-------------|
| `server-response.json` | **Yes** | Finalized execute/context/result for the step |
| `messages.json` | **Yes** | Step-scoped slice of conversation |
| `client-result.json` | Yes | User input captured for this step |
| `request-to-server.json` | Yes | Payload sent to A2A Server |
| `server-promise.json` | **No** | Must NOT exist (async completed) |

### 2. Pending Step (async in-flight, with `server-promise.json`)

| File | Required | Description |
|------|----------|-------------|
| `server-promise.json` | **Yes** | Pending promise metadata (promiseId, status) |
| `client-result.json` | Yes | User input captured for this step |
| `request-to-server.json` | Yes | Payload sent to A2A Server |
| `server-response.json` | **No** | Must NOT exist (awaiting completion) |
| `messages.json` | **No** | May not exist yet |

---

## File Semantics

### `client-result.json`

User input captured **before** the step is sent to A2A Server.

```json
{
  "result": { "message": "user input text" },
  "metadata": {
    "source": "user" | "system" | "tool",
    "timestamp": "ISO-8601"
  }
}
```

**Rules:**
- Written before invoking A2A Server
- `metadata.source` distinguishes user input from auto-responses

### `request-to-server.json`

Payload that was forwarded to the A2A Server (`/api/v1/invoke`).

```json
{
  "task": "...",
  "context": { ... },
  "result": { ... }
}
```

**Rules:**
- Written after user input but before invoking server
- Preserved for diagnostics/debugging

### `server-response.json`

Finalized execute/context/result from A2A Server.

```json
{
  "execute": { "form": {...} },
  "context": { "execution": {...}, "workbench": {...} },
  "result": { "read-file": {...} }
}
```

**Rules:**
- Only exists for completed steps
- Must have action-key shape: `{ "<action>": {...} }`
- `messages.json` is stored separately (not embedded)

### `server-promise.json`

Temporary async state while waiting for completion.

```json
{
  "promiseId": "prom_...",
  "status": "pending" | "processing",
  "submittedAt": "ISO-8601"
}
```

**Rules:**
- Must be deleted when async completes
- Server writes this file first, then writes `server-response.json` on completion

### `messages.json`

Step-scoped slice of conversation for this step.

```json
[
  { "role": "assistant", "content": "...", "step": 1 },
  { "role": "user", "content": "...", "step": 1 },
  { "role": "system", "content": "...", "step": 1 }
]
```

**Rules:**
- Written only when step completes (not during async pending)
- Merged across all steps to rebuild full timeline
- `system` role is preserved from `metadata.source`

---

## System Role Messages (Red Room Auto-Responses)

### Definition

**Red Room** = client-side tool execution triggered by server's `execute` (tool actions). The server returns an execute payload, client runs the tool, then sends the result back.

### Persistence Rules

1. **Tool execution result** is persisted as `client-result.json`:
   ```json
   {
     "result": { "content": "tool output", "<action>": {...} },
     "metadata": {
       "source": "tool",
       "action": "read-file | rag-search | ..."
     }
   }
   ```

2. **System prompt responses** (server-side system prompts that are executed):
   - Stored in `context.history` within `server-response.json`
   - May have `role: 'system'` in messages

3. **Auto-responses from server** (e.g., status messages):
   - Detected via `metadata.source === 'system-prompt'` or `metadata.type === 'system'`
   - Preserved in `messages.json` with `role: 'system'`

4. **Timeline reconstruction** (`message-timeline.js`):
   - Sources: `context.history` → `execute.message` → `step.messages` → `client-result`
   - Priority order ensures system messages are not lost
   - System role derived from `item.metadata?.source === 'system'`

---

## Recovery Rules (Missing Artifacts)

### Scenario: No `server-response.json` in any step

```
storage/sessions/{sid}/
├── 1/
│   ├── client-result.json
│   └── request-to-server.json
└── 2/
    ├── client-result.json
    └── server-promise.json
```

**Recovery:**
1. Highest step with `server-promise.json` is the in-flight step
2. Poll `/sessions/{id}/async` to check completion
3. If promise still pending: show loader, wait for completion
4. If promise failed/missing: treat step as failed, allow retry

### Scenario: Missing `client-result.json`

**Recovery:**
- If `server-response.json` exists without `client-result.json`:
  - This is a server-generated response (not triggered by user)
  - `client-result.json` is optional for server-initiated steps
- If only `request-to-server.json` exists:
  - Step is incomplete/corrupted
  - Return session with `status: 'corrupt'`

### Scenario: Only `server-promise.json`, no other files

**Recovery:**
- This is a valid in-flight state
- `client-result.json` was already written (to the previous step)
- Current step is waiting for async completion
- Start polling immediately

### Scenario: Stale `server-promise.json` (async never completed)

**Recovery:**
1. Check promise status via `/api/v1/requests/{promiseId}/result`
2. If still pending: continue polling
3. If failed/expired:
   - Mark step as failed
   - Allow user to retry with new `/next`

### Scenario: Missing `messages.json` after completion

**Recovery:**
- Regenerate from `server-response.json` if possible
- If `context.history` exists, reconstruct timeline
- If no history: use `execute.message` as sole message

### Scenario: Session index mismatch

`session-index.json` may be stale. Recovery:
1. Always verify against actual step files
2. Re-scan step folders to find highest step with `server-response.json`
3. Update index on each write

---

## Response ↔ Received Validation

### Invariant

Every step that has `server-response.json` MUST have a corresponding `received.json` (or equivalent client-side artifact) that represents the sanitized web DTO after server transforms. The relationship is:

```
server-response.json (raw server execute/context/result)
    ↓ client transforms (toWebExecute)
received.json (web-safe execute without tool-actions)
```

### Validation Rules

| Rule | Description |
|------|-------------|
| **Complete Pipeline** | For every `server-response.json` there MUST be a `received.json` in simulations or equivalent client state |
| **Sanitized Execute** | `received.json.execute` must NOT contain tool-actions (`rag-search`, `read-file`, `write-file`, `run-script`) - these stay server-side |
| **Web-Safe Fields** | `execute` in `received.json` may only have: `message`, `form`, `attachments` |

### Incomplete Pipeline Reasons

When a simulation has `server-response.json` but NO `received.json`, the reason MUST be documented in the simulation folder `README.md` or a `INCOMPLETE.md` file:

| Reason | Description |
|--------|-------------|
| `agent-tool-loop` | Agent mode continues looping; `received.json` would be intermediate, not final |
| `async-pending` | Step has `server-promise.json` but not yet completed |
| `gray-room-chain` | Server-side interrupt chain (Gray Room) that client never receives |
| `deprecated-format` | Legacy simulation using old schema (not migrated) |
| `test-only` | Unit test fixture, not a full end-to-end simulation |
| `in-progress` | Active development, pipeline not yet complete |

### Examples

```markdown
# simulations/dialog/example/README.md

## Pipeline Status

- ✅ `request.json` → `server-transforms-request.json` → `request.md`
- ✅ LLM processed → `response.md`
- ✅ `response.json` → `server-transforms-response.json`
- ✅ Client sanitized → `received.json`

**Complete pipeline.**
```

```markdown
# simulations/agent-tool-loop/example/README.md

## Pipeline Status

- ✅ Full pipeline up to `server-response.json`
- ❌ No `received.json` — Agent tool loop continues

## Incomplete Reason

`agent-tool-loop`: Agent mode has multiple tool executions. `received.json` would be intermediate state, not final. The loop continues until tool-action count reaches limit or user provides final input.
```

---

## Validation Targets (Extended)

| Rule | Validation |
|------|------------|
| No missing files for finalized steps | `server-response.json` + `messages.json` must coexist |
| No stale `server-promise.json` after completion | File must be deleted when async resolves |
| Reconstructed session matches latest finalized step | Highest step with `server-response.json` = current step |
| System messages preserved | `role: 'system'` in timeline from metadata detection |
| Async workflow integrity | `server-promise.json` → completion deletes file → writes response |
| **Response ↔ Received** | Every `server-response.json` has `received.json` (or documented reason) |
| **Sanitized Execute** | `received.json.execute` contains NO tool-actions |

---

## Related Documentation

- [`SESSION-READ-MODEL.md`](./SESSION-READ-MODEL.md) - Read pipeline and rendering
- [`session-management-protocols.md`](./session-management-protocols.md) - Full lifecycle diagrams
- [`WEB_UI_PROTOCOL.md`](./WEB_UI_PROTOCOL.md) - Client API contract
- [`RED-ROOM.md`](./RED-ROOM.md) - Client-side tool execution
- [`GRAY-ROOM.md`](./GRAY-ROOM.md) - Server-only interrupt chains
