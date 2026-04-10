# Dialog Simulation Files Workflow

## Web Execute Variants (Web Rendering Contract)

The `received.json` files define what the web receives. The web must handle all these `execute` shapes:

| Step | `received.json` execute shape                  | Web renders                                   |
|------|------------------------------------------------|-----------------------------------------------|
| 1    | `{ form: { title, choices: [...] } }`          | Choice buttons (router)                       |
| 2    | `{ form: { input: [{ name, type, label }] } }` | Text input (begin dialog)                     |
| 3+   | `{ message: "...", form: { input: [...] } }`   | History (message added to store) + text input |
| any  | `result.completed` / execution `completed`    | Completed state                               |

**Key rules:**

- `execute.form.choices` → render choice buttons, NO text input at bottom
- `execute.form` (no choices) → use `input[0].label` as placeholder for bottom text input; no separate labeled
  fields
- `execute.message + execute.form` → message is pushed to history by `SessionStore.setExecute()` before render;
  bottom input stays open
- `execute.message` only (no form) → show message in container + bottom input to continue
- Client sends: `{ result: { choice: "id" } }` for choices, `{ result: { message: "text" } }` for text input

**Renderer:** `a2a-client/web/js/task-flow/render.js` → `renderExecute()` → `renderForm()` / `renderMessage()`

---

## File Types

Each dialog step can contain up to 8 files, covering the complete Web ↔ Client API ↔ Server ↔ LLM pipeline:

| File                              | Direction           | Description                                                                                                               |
|-----------------------------------|---------------------|---------------------------------------------------------------------------------------------------------------------------|
| `client.json`                     | Web → Client API    | What Web sends to Client API (e.g. `{ task, projectId }`, `{ sessionId, result }`)                                        |
| `request.json`                    | Client API → Server | Payload from Client API to Server (context + result), already without `projectId`/`sessionId`                             |
| `server-transforms-request.json`  | Server              | How the server processes `request.json` and builds the LLM input (transformation before calling LLM). Optional.           |
| `request.md`                      | Server → LLM        | Markdown sent to LLM (system prompt + current state)                                                                      |
| `response.md`                     | LLM → Server        | Expected LLM output (e.g. JSON with `message`, `action`)                                                                  |
| `server-transforms-response.json` | Server              | How the server processes `response.md` and builds the client payload (transformation before sending to client). Optional. |
| `response.json`                   | Server → Client API | Payload sent to Client API (context + execute, etc.)                                                                      |
| `received.json`                   | Client API → Web    | What Client API returns to Web (e.g. `{ projectId, sessionId, execute }`)                                                 |

**Order (полный pipeline):**

`client.json → request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json → response.json → received.json`

Not every step has all 8 files: steps without LLM **always require** `server-transforms-request.json` (to transform request into execute); `server-transforms-response.json` is NOT needed because there's no LLM to parse. Steps with LLM add the `.md` files and require both transforms.

> **Critical:** Server always transforms request first. Without LLM: `request.json → server-transforms-request.json → response.json` (server builds execute directly).

### Supplementary: `interrupt.md` (optional)

Per-step **documentation** for the [**gray room**](../a2a-server/docs/GRAY-ROOM.md) (extra LLM turns
before returning to the client). Does **not** affect Web `received.json` or the eight-file pipeline. Canonical
description: [`simulations/SCHEMA.md`](../SCHEMA.md#supplementary-server-interrupt-loop-optional). Example: [
`agent-auto-ai/6/interrupt.md`](../agent-auto-ai/6/interrupt.md). **Substeps:** sister folders **`N-sub-M`** (`M` =
1,2,…) next to step `N`, e.g. [`agent-auto-ai/6-sub-1/`](../agent-auto-ai/6-sub-1/) — **server-internal** only (no Web
`client.json` / `received.json`; see [`SCHEMA.md`](../SCHEMA.md)).

## Server Transform Pipeline Operations

The `server-transforms-*.json` files define pipeline operations for processing data:

### Request Transform Operations (server-transforms-request.json)

```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "copy",
      "from": "$",
      "to": "$out"
    },
    {
      "op": "append-to-array",
      "to": "$.context.history",
      "value": {
        "role": "user",
        "message": "$.result.message"
      }
    },
    {
      "op": "render-markdown",
      "templateRef": "a2a-server/prompts/dialog-request.md",
      "data": "$out",
      "outputFile": "request.md"
    }
  ]
}
```

### Response Transform Operations (server-transforms-response.json)

```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "parse-json-from-md",
      "fromFile": "response.md",
      "jsonPath": "$",
      "to": "$llm"
    },
    {
      "op": "append-to-array",
      "to": "$.context.history",
      "value": {
        "role": "assistant",
        "message": "$.llm.message"
      }
    },
    {
      "op": "set",
      "path": "$.execute",
      "value": {
        "form": {
          "input": [...]
        }
      }
    }
  ]
}
```

## ВАЖНО: request.md - это MARKDOWN!

**НЕ** используй формат:

```json
{
  "model": "qwen3:8b",
  "messages": [...]
}
```

**ИСПОЛЬЗУЙ** формат:

```markdown
## System Prompt

<markdown instructions + embedded JSON>
```

Подробный пример находится ниже в разделе `request.md (Server → LLM)`.

## Flow Diagram

```
Web    Client API    Server    LLM
│         │          │        │
│ client.json        │        │
│─────────>│         │        │
│         │ request.json      │
│         │─────────>│        │
│         │         │ request.md
│         │         │─────────>│
│         │         │         │
│         │         │ response.md
│         │         │<─────────│
│         │ response.json      │
│         │<─────────│         │
│ received.json       │        │
│<────────│          │        │
```

## File Formats

### request.json (Client → Server)

```json
{
  "context": {
    "task": "dialog"
  },
  "input": {
    "messages": [
      {
        "content": "user message"
      }
    ]
  }
}
```

**Key points:**

- `input.messages` contains content without role (role is added by server)
- May contain `context.history` for subsequent turns

### request.md (Server → LLM) - MARKDAOWN!

```markdown
## System Prompt

продовжи діалог в json . відповідь оновленим json 

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      }
    ]
  }
}
```

```

**Key points:**
- Uses MARKDOWN format with system prompt
- NOT JSON with model/messages
- LLM must respond with updated JSON
- Complex prompt that transforms client input

### response.md (LLM → Server)

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      },
      {
        "role": "assistant",
        "message": "hello world"
      }
    ]
  }
}
```

**Key points:**

- Contains full context with updated history
- LLM returns JSON with history
- This is what would be sent to LLM in next turn

### response.json (Server → Client)

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      " Загрузка... </button>
    </div>
  </div>
</div>

<div class="p-4 bg-blue-50 rounded-lg">
  <h4 class="font-medium mb-2">💡 Key Insight</h4>
  <p class="text-sm">
    The history is built from the LLM response. The client sends 
    <code>content</code>, and the server adds the <code>role</code> 
    when building the conversation history.
  </p>
</div>
```

### 💻 Implementation

#### DialogForm.vue

```vue
<template>
  <form @submit.prevent="submitMessage">
    <input 
      v-model="message" 
      placeholder="Type your message..."
      class="border p-2 rounded"
    />
    <button type="submit">Send</button>
  </form>
</template>

<script setup>
const message = ref('')
const emit = defineEmits(['submit'])

function submitMessage() {
  // Client sends content WITHOUT role
  emit('submit', { content: message.value })
  message.value = ''
}
</script>
```

#### Server Processing

```javascript
async function processMessage(input) {
  // Build history
  const messages = context.history.map(h => ({
    role: h.role,
    content: h.message
  }))
  
  // Add current message with role: user
  messages.push({ 
    role: 'user', 
    content: input.messages[0].content 
  })
  
  // Call LLM
  const llmResponse = await callLLM(messages)
  
  // Add assistant response to history
  messages.push({ 
    role: 'assistant', 
    content: llmResponse.message 
  })
  
  // Return to client
  return {
    context: { history: buildHistory(messages) },
    execute: { form: {...} }
  }
}
```

---

## 🎯 Summary

| Aspect                | Description                          |
|-----------------------|--------------------------------------|
| **Initial State**     | Client sends content-only message    |
| **Server Processing** | Adds role: "user", calls LLM         |
| **LLM Request**       | System prompt + messages with roles  |
| **LLM Response**      | Assistant message                    |
| **Server Response**   | Returns history with both roles      |
| **Client UI**         | Shows conversation with proper roles |

The key insight is that **roles are added by the server**, not by the client. The client only provides the message
content.

---

## 🔧 Server Implementation Details

### Context Building

```typescript
function buildContext(input: Input): Context {
  // Start with existing history
  const messages: Message[] = context.history.map(h => ({
    role: h.role,
    content: h.message
  }))
  
  // Add new user message
  messages.push({
    role: 'user',
    content: input.messages[0].content
  })
  
  return {
    task: context.task,
    execution: { action: 'dialog', step: 'request' },
    history: messages
  }
}
```

### LLM Call

```typescript
async function callLLM(messages: Message[]): Promise<LLMResponse> {
  const response = await fetch('http://localhost:11435/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:8b',
      messages,
      stream: false
    })
  })
  
  return response.json()
}
```

### Response Building

```typescript
function buildResponse(llmResponse: LLMResponse, context: Context): ServerResponse {
  // Add assistant message to history
  const history = [
    ...context.history,
    { role: 'assistant', message: llmResponse.message.content }
  ]
  
  return {
    context: {
      task: context.task,
      execution: { action: 'dialog', step: 'request' },
      history
    },
    execute: {
      form: {
        input: {},
        output: 'message',
        required: ['messages']
      }
    }
  }
}
```

---

## 📝 Important Notes

1. **No optimization in prompts** - Use full complex format
2. **Model**: Uses "qwen3:8b" or similar
3. **System prompt**: "продовжи діалог" for continuing dialog
4. **History building**: Server adds roles when building messages
5. **request.md format**: MARKDOWN with system prompt, NOT JSON with model/messages

