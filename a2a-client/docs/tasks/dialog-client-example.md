# Dialog Example: Simulation → a2a-client

Example of how `simulations/dialog` (repo root) steps map to the **a2a-client** (Web + Client API).

---

## Flow (4 steps)

| Step | Web sends (client.json) | Client API → Server (request.json) | Server → Web (received.json) |
|------|--------------------------|------------------------------------|------------------------------|
| 1 | `{ task, projectId }` | `context` + `result.message` | `execute.form.choices` (dialog / auto-ai / task-decomposition) |
| 2 | `{ sessionId, result: { choice: "dialog" } }` | `context` + `result.choice` | `execute.form.input` (message field), `execution.action = "dialog"` |
| 3 | `{ sessionId, result: { message: "hello world" } }` | `context` + `result.message` | LLM reply → `execute.message` + `execute.form.input`, `context.history` |
| 4 | `{ sessionId, result: { message: "Дякую!" } }` | `context` + `result.message` | `execution.step = "completed"`, `context.history` full, optional `execute` |

---

## Step-by-step payloads (from simulation)

### Step 1: Start task → get choices

**Web → Client API (client.json):**
```json
{
  "task": "диалог",
  "projectId": "123"
}
```

**Client API → Server (request.json):** built from new-session flow; server gets `context.execution.step = "new"`, `result.message = "диалог"`.

**Server → Web (received.json):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog", "label": "AI діалог з користувачем" },
        { "id": "auto-ai", "label": "AI Action Generator" },
        { "id": "task-decomposition", "label": "Декомпозиція задачі" }
      ]
    }
  }
}
```

**Web:** Render `execute.form.choices` as buttons; on click call `sendChoice(sessionId, projectId, "dialog")`.

---

### Step 2: Send choice "dialog" → get message input form

**Web → Client API (client.json):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "result": { "choice": "dialog" }
}
```

**Client API → Server (request.json):**
```json
{
  "context": {
    "task": "диалог",
    "execution": { "action": "task", "step": "router" }
  },
  "result": { "choice": "dialog" }
}
```

**Server → Web (received.json):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "execute": {
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Повідомлення", "required": true }
      ]
    }
  }
}
```

**Web:** Render `execute.form.input` (text field); on submit call `sendMessage(sessionId, projectId, userText)`.

---

### Step 3: Send message → LLM reply + next input

**Web → Client API (client.json):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "result": { "message": "hello world" }
}
```

**Client API → Server (request.json):**
```json
{
  "context": {
    "task": "диалог",
    "execution": { "action": "dialog", "step": "request" }
  },
  "result": { "message": "hello world" }
}
```

**Server → Web (received.json):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "execute": {
    "message": "hello world",
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Повідомлення", "required": true }
      ]
    }
  }
}
```

**Web:** Append user "hello world" and assistant "hello world" to chat (from `context.history` when provided in session DTO); show `execute.message`; render `execute.form.input` for next message.

---

### Step 4: Send "Дякую!" → dialog completed

**Web → Client API (client.json):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "result": { "message": "Дякую!" }
}
```

**Client API → Server (request.json):**
```json
{
  "context": {
    "task": "диалог",
    "execution": { "action": "dialog", "step": "llm-request" },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  },
  "result": { "message": "Дякую!" }
}
```

**Server → Web (received.json):** `context.execution.step = "completed"`, `context.history` includes all three messages; optional last `execute.message` + form.

**Web:** If `execution.step === "completed"`, treat dialog as finished; optionally hide input or show final state.

---

## Where in a2a-client

### Web → Client API (building client.json)

- **New task (step 1):** Create session with `task` (e.g. `api-integration.js` `sendTask()` or session create); Client API turns this into first `/invoke` with `result.message` = task text.
- **Continuation (steps 2–4):** `POST /api/sessions/:sessionId/result` with body:
  - `{ projectId, result: { choice: "dialog" } }` for choices,
  - `{ projectId, result: { message: "user text" } }` for dialog messages.

**Code:** `web/js/action-handler.js` — `submit(sessionId, projectId, result)` sends `{ projectId, result }`; `sendChoice()` uses `{ choice: choiceId }`, `sendMessage()` uses `{ message: payload }`. Request: `POST /sessions/:sessionId/result` (line ~97).

### Client API → Server (request.json)

- SDK (`packages/sdk/src/server/index.ts`): `POST /api/sessions/:sessionId/result` handler (~1061) reads `req.body.result` (and optional `req.body.projectId`), loads session, builds:
  - `requestBody.context`: `version`, `session_id`, `task`, `execution`, `history` from session,
  - `requestBody.result`: same as `req.body.result` (action-key shape).
- Forwards to server: `POST <serverBase>/invoke` with `requestBody` (~1113).

### Server → Web (received.json)

- Response from `/invoke` or `/sessions/:id/result` is returned to Web; SDK can broadcast via SSE (`emitServerSse(sessionId, payload, 'task_response')`). Web receives payload with `data.execute`, `data.context`.
- **Handling execute:**
  - `execute.form.choices` → render buttons; on click → `ActionHandler.sendChoice(sessionId, projectId, choiceId)`.
  - `execute.form.input` → render inputs; on submit → `ActionHandler.sendMessage(sessionId, projectId, text)`.
  - `execute.message` → show as assistant message (string or `{ content }`).
- **Handling context:** Use `context.history` for conversation display; use `context.execution.step === "completed"` to detect dialog end.

**Code:** `web/js/app/window-manager.js` (~337–347): `sendMessageResult` → `sendMessage`, `sendChoiceResult` → `sendChoice`. `web/js/task-flow/render.js` (~139–140, 165–174, 206–207, 247–248): renders message, choices, inputs and wires `sendChoice` / `sendMessageResult`. `web/js/session-store.js` (~195–197): normalizes `execute.message` for display. `web/js/session-store-adapters.js` (~264): maps execute to `type: 'message'`.

---

## Action-key shape (mandatory)

- **Result from Web:** One key per request: `{ choice: "dialog" }` or `{ message: "hello world" }`. No flat `{ choice, message }` in one payload.
- **Validation:** `web/js/action-handler.js` `submit()` checks `Object.keys(result).length === 1` (line ~86).

---

## File reference (paths relative to a2a-client)

| Role | Path |
|------|------|
| Simulation steps | repo: `simulations/dialog/1/` … `4/` (`client.json`, `request.json`, `received.json`, …) |
| Pipeline spec | repo: `simulations/dialog/WORKFLOW.md` |
| Client API (result + invoke) | `packages/sdk/src/server/index.ts` (sessions result ~1061, invoke forward ~979–984) |
| Web: send choice/message | `web/js/action-handler.js` (`sendChoice`, `sendMessage`, `submit`) |
| Web: session/window | `web/js/app/window-manager.js` (`sendMessage`, `sendChoice`) |
| Web: execute rendering | `web/js/task-flow/render.js` (form.choices, form.input, execute.message) |
| Web: session state | `web/js/session-store.js`, `web/js/session-store-adapters.js` |
| Web: AI panel | `web/js/components/ai-actions.js` (form.choices, form.input, execute.message) |
| Tasks | [dialog-frontend-tasks.md](dialog-frontend-tasks.md) |

---

## Minimal received shapes (reference)

**After step 1 (choices):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog", "label": "AI діалог з користувачем" },
        { "id": "auto-ai", "label": "AI Action Generator" },
        { "id": "task-decomposition", "label": "Декомпозиція задачі" }
      ]
    }
  }
}
```

**After step 3 (LLM reply + next input):**
```json
{
  "projectId": "123",
  "sessionId": "456",
  "execute": {
    "message": "hello world",
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Повідомлення", "required": true }
      ]
    }
  }
}
```

**After step 4 (completed):** Same structure possible; check `context.execution.step === "completed"` and `context.history` for full conversation. Web shows `execute.message` and can hide or disable input when step is `completed`.
