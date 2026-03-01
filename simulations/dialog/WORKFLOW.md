# Dialog Simulation Files Workflow

## File Types

Each dialog step can contain up to 6 files, in pipeline order:

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | What client sends to server |
| `server-transforms-request.md` | — | How the server processes `request.json` and builds the LLM input. Optional. |
| `request.md` | Server → LLM | What server sends to External AI Hub (LLM) |
| `response.md` | LLM → Server | What LLM returns to server |
| `server-transforms-response.md` | — | How the server processes `response.md` and builds the client payload. Optional. |
| `response.json` | Server → Client | What server sends back to client |

**Order:** request.json → server-transforms-request.md → request.md → response.md → server-transforms-response.md → response.json.

Not every step has all 6 files: steps without LLM typically have only `request.json` and `response.json`; transform docs are optional and describe server logic.

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

продовжи діалог в json . відповідь оновленим json 

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
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

## Flow Diagram

```
Client              Server              LLM
  │                   │                   │
  │ request.json      │                   │
  │──────────────────>│                   │
  │                   │                   │
  │                   │ request.md (MARKDOWN!) │
  │                   │──────────────────>│
  │                   │                   │
  │                   │ response.md      │
  │                   │<──────────────────│
  │                   │                   │
  │ response.json     │                   │
  │<──────────────────│                   │
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
      "step": "llm-request"
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
      "step": "llm-request"
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

| Aspect | Description |
|--------|-------------|
| **Initial State** | Client sends content-only message |
| **Server Processing** | Adds role: "user", calls LLM |
| **LLM Request** | System prompt + messages with roles |
| **LLM Response** | Assistant message |
| **Server Response** | Returns history with both roles |
| **Client UI** | Shows conversation with proper roles |

The key insight is that **roles are added by the server**, not by the client. The client only provides the message content.

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
    execution: { action: 'dialog', step: 'llm-request' },
    history: messages
  }
}
```

### LLM Call

```typescript
async function callLLM(messages: Message[]): Promise<LLMResponse> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
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
      execution: { action: 'dialog', step: 'llm-request' },
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
2. **Model**: Uses "llama3" or similar
3. **System prompt**: "продовжи діалог" for continuing dialog
4. **History building**: Server adds roles when building messages
5. **request.md format**: MARKDOWN with system prompt, NOT JSON with model/messages
