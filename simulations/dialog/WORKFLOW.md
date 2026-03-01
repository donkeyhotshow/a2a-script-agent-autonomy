# Dialog Simulation Files Workflow

## File Types

Each dialog step contains 4 file types:

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | What client sends to server |
| `request.md` | Server → LLM | What server sends to External AI Hub (LLM) |
| `response.md` | LLM → Server | What LLM returns to server |
| `response.json` | Server → Client | What server sends back to client |

## Flow Diagram

```
Client              Server              LLM
  │                   │                   │
  │ request.json      │                   │
  │──────────────────>│                   │
  │                   │                   │
  │                   │ request.md        │
  │                   │──────────────────>│
  │                   │                   │
  │                   │ response.md       │
  │                   │<──────────────────│
  │                   │                   │
  │ response.json     │                   │
  │<──────────────────│                   │
  │                   │                   │
```

## File Formats

### request.json (Client → Server)

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
    }
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

### request.md (Server → LLM)

```json
{
  "model": "qwen3:8b",
  "messages": [
    {
      "role": "system",
      "content": "продовжи діалог"
    },
    {
      "role": "user",
      "content": "hello world"
    }
  ],
  "stream": false
}
```

**Key points:**
- Uses complex prompt format with system prompt
- Transforms client's content-only messages into proper role-based messages
- Includes history from previous turns for context

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
- Server processes LLM response and builds history
- This is what would be sent to LLM in next turn

### response.json (Server → Client)

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
  },
  "execute": {
    "form": {
      "input": {},
      "output": "message",
      "required": ["messages"]
    }
  }
}
```

**Key points:**
- Same as response.md but with `execute.form` added
- `execute.form` allows client to continue dialog
- For completed dialogs, uses `execute.result` instead

## Step-by-Step Flow

### Step 1: Initial Request
- Client sends initial request
- Server returns form for first message

### Step 2: Client Provides Input
- Client sends message content
- Server prepares to call LLM

### Step 3: First LLM Call (No History)
- Server sends to LLM (request.md): system prompt + user message
- LLM returns response (response.md)
- Server responds to client (response.json) with history + form

### Steps 4+: Subsequent Turns
- Client sends result message + server has history
- Server sends to LLM (request.md): system + history + new message
- LLM returns response (response.md)
- Server responds to client (response.json) with updated history

## Important Notes

1. **No optimization in prompts** - Request.md uses full complex format
2. **Model**: Uses "qwen3:8b" for all LLM calls
3. **System prompt**: "продовжи діалог" for continuing dialog
4. **History building**: Server adds roles when building history from client's content-only messages
