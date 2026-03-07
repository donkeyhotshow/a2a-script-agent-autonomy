# Dialog Frontend Implementation Tasks

Based on `simulations/dialog/WORKFLOW.md` - complete Web ↔ Client API ↔ Server ↔ LLM pipeline implementation.

**Example (payloads + code mapping):** [dialog-client-example.md](dialog-client-example.md).

**Architecture & audit:** [dialog-architecture-tasks.md](dialog-architecture-tasks.md) (session lifecycle, execute catalog, SSE/WS, SessionSync).

## Status (updated)

| Task | Status | Notes |
|------|--------|--------|
| 1 Dialog Message Flow Core | Pending | No `dialog-handler.js`; flow partly in `api-integration.js`, `session-sync-v2.js`, `session-store.js` |
| 2 Server Transform Pipeline UI | Pending | No `transform-renderer.js` |
| 3 Execute Types (form, message, finalResult) | Done | `ai-actions.js`, `session-store.js`, `session-store-adapters.js`, `task-flow/render.js`, `action-handler.js` |
| 4 Session Store Dialog Integration | Partial | `session-store.js`: `pendingForm`, history, `setExecute` for form/message/finalResult |
| 5 Dialog UI Components | Partial | Chat/message UI in `ai-actions.js`, `window-manager.js`; no dedicated `dialog-panel.js` |
| 6 Action-Key Shape Compliance | Done | `action-handler.js`: `submit()`, `sendChoice()`, `sendMessage()`, action-key validation |
| 7 LLM Request/Response Display | Pending | No `llm-debug-panel.js` |
| 8 Dialog E2E Tests | Pending | No `web/tests/e2e/dialog-flow.spec.js` |

---

## Task 1: Dialog Message Flow Core

**File:** `web/js/dialog-handler.js` (new)

Implement the complete message flow as defined in WORKFLOW.md:

### 1.1 Client Request Builder
- Build `client.json` payload: `{ task, projectId }` for new dialog, `{ sessionId, result }` for continuation
- Send content WITHOUT role (server adds role: "user")
- Format: `input.messages[0].content` - flat content only

### 1.2 Response Handler  
- Handle `received.json` from Client API: `{ projectId, sessionId, execute }`
- Extract `execute.form` for interactive steps
- Extract `execute.message` for display-only steps
- Handle `context.history` for conversation continuity

### 1.3 History Management
- Build conversation history from server responses
- Each entry: `{ role: "user" | "assistant", message: string }`
- Append new messages without re-rendering entire history

**Acceptance:**
- User message sends without role field
- Server returns history with proper roles added
- UI displays conversation with user/assistant labels

---

## Task 2: Server Transform Pipeline UI

**Files:** `web/js/transform-renderer.js` (new), update `task-flow.js`

### 2.1 Request Transform Visualization
- Parse `server-transforms-request.json` operations:
  - `copy`: Show data flow from `$` to `$out`
  - `append-to-array`: Visualize history append with role
  - `render-markdown`: Show template rendering to `request.md`

### 2.2 Response Transform Visualization  
- Parse `server-transforms-response.json` operations:
  - `parse-json-from-md`: Extract JSON from `response.md`
  - `append-to-array`: Show assistant message append
  - `set`: Display execute object construction

### 2.3 Pipeline Debug Panel
- Collapsible transform inspection in debug panel
- Show before/after for each transform step
- Highlight `request.md` markdown format vs JSON

**Acceptance:**
- Debug panel shows transform pipeline steps
- Each operation visualized with data diff
- Template rendering shown with source reference

---

## Task 3: Execute Types for Dialog

**File:** Update `web/js/action-handler.js`, `web/js/task-flow.js`

### 3.1 Form Execute Handler
```typescript
// Handle execute.form with choices
{
  form: {
    choices: [{ id: string, label: string }],
    input?: Record<string, any>
  }
}
```
- Render choice buttons
- Handle choice submission via action-key: `{ choice: "id" }`

### 3.2 Message Execute Handler
```typescript
// Handle execute.message  
{
  message: {
    content: string,
    type?: "info" | "warning" | "error"
  }
}
```
- Render message with optional styling
- Auto-continue or show continue button

### 3.3 FinalResult Handler
```typescript
// Handle completion
{
  finalResult: {
    action: string,
    summary: Record<string, any>
  }
}
```
- Show completion summary
- Display action name and result fields

**Acceptance:**
- Form choices render as clickable buttons
- Message display with proper formatting  
- Final result shows structured summary

---

## Task 4: Session Store Dialog Integration

**File:** Update `web/js/session-store.js`

### 4.1 Dialog State Shape
```typescript
interface DialogState {
  sessionId: string;
  projectId: string;
  task: string;
  history: Array<{
    role: "user" | "assistant";
    message: string;
    timestamp?: number;
  }>;
  execution: {
    action: string;
    step: string;
    progress?: number;
  };
  pendingForm: {
    choices: Array<{id: string, label: string}>;
  } | null;
}
```

### 4.2 History Methods
- `pushMessage(content, role)` - append to history
- `getHistory()` - retrieve full conversation
- `clearHistory()` - reset for new dialog

### 4.3 Form State Methods
- `setPendingForm(choices)` - store current form options
- `clearPendingForm()` - clear after submission
- `getPendingForm()` - retrieve for rendering

**Acceptance:**
- History persists across session updates
- Form state available for re-render
- Clear separation between dialog and other task types

---

## Task 5: Dialog UI Components

**Files:** `web/js/components/dialog-panel.js` (new), update `panel-manager.js`

### 5.1 Dialog Panel Component
- Chat-style message display
- Scrollable message history
- Auto-scroll to latest message
- Typing indicator for LLM processing

### 5.2 Message Renderers
```typescript
type MessageRenderer = (message: {
  role: "user" | "assistant";
  content: string;
  metadata?: any;
}) => HTMLElement;
```
- User message: right-aligned, distinct styling
- Assistant message: left-aligned, markdown support
- System message: centered, muted styling

### 5.3 Input Area
- Text input with submit button
- Disable during processing
- Show character count
- Support Enter to submit

**Acceptance:**
- Messages display with correct alignment
- History scrolls automatically
- Input disabled while waiting for response

---

## Task 6: Action-Key Shape Compliance

**File:** Update `web/js/action-handler.js`

### 6.1 Result Submission Validation
All results MUST use action-type keys:
```typescript
// Correct:
{ result: { "read-file": { path, content } } }
{ result: { "script": { input, output } } }
{ result: { "choice": "choice_id" } }
{ result: { "message": "text" } }

// Incorrect (reject):
{ result: { content: "..." } }
{ result: { action: "read-file", file: "..." } }
```

### 6.2 Submit Methods Update
```typescript
async submit(sessionId, projectId, result, context?)
async sendChoice(sessionId, projectId, choiceId)  
async sendMessage(sessionId, projectId, text)
async submitFileResult(sessionId, projectId, fileResult)
async submitScriptResult(sessionId, projectId, scriptResult)
```

### 6.3 Error Handling
- Validate action-key shape before sending
- Throw if multiple keys or no action-type key
- Log rejected submissions for debugging

**Acceptance:**
- All submissions use action-key shape
- Validation catches incorrect formats
- Error messages indicate proper format

---

## Task 7: LLM Request/Response Display

**File:** `web/js/components/llm-debug-panel.js` (new)

### 7.1 Request Display
- Show `request.md` content (markdown format)
- Highlight system prompt vs JSON context
- Display model info if available

### 7.2 Response Display  
- Show `response.md` raw content
- Parsed JSON view with syntax highlighting
- Diff view for context changes

### 7.3 History Timeline
- Visual timeline of request/response pairs
- Show timing between steps
- Collapsible full content view

**Acceptance:**
- Markdown rendered correctly
- JSON parsed and highlighted
- Timeline shows step sequence

---

## Task 8: Dialog Testing Scenarios

**Files:** `web/tests/e2e/dialog-flow.spec.js` (new)

### 8.1 Basic Dialog Flow
```javascript
test('user sends message → sees response', async () => {
  // Send: { input: { messages: [{ content: "hello" }] } }
  // Receive: { execute: { message: { content: "hello world" } } }
})
```

### 8.2 Multi-Turn Dialog
```javascript
test('conversation history persists', async () => {
  // Turn 1: User "hello" → Assistant "hi"
  // Turn 2: User "how are you" → Assistant uses history context
})
```

### 8.3 Form Interaction
```javascript
test('form choices render and submit', async () => {
  // Receive: { execute: { form: { choices: [...] } } }
  // Click choice button
  // Send: { result: { choice: "choice_id" } }
})
```

**Acceptance:**
- Tests cover full pipeline
- Mock server responses via fixtures
- Verify action-key shape in submissions

---

## Implementation Priority

1. **Task 1** - Core message flow (blocking)
2. **Task 4** - Session store integration (blocking)
3. **Task 3** - Execute handlers (blocking)
4. **Task 6** - Action-key compliance (blocking)
5. **Task 5** - UI components
6. **Task 2** - Transform visualization
7. **Task 7** - Debug panels
8. **Task 8** - Testing

## References

- `simulations/dialog/WORKFLOW.md` - Complete pipeline documentation
- `simulations/SCHEMA.md` - Action-key shape specification
- `a2a-server/prompts/dialog-request.md` - Server prompt template
