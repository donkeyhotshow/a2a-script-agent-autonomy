# A2A Workflow (Linear Model)

This document defines the base linear flow and operational terms used in the project.

## Flow Diagram

```
Client/UI   Client API      Server/Core       LLM/External AI
   │            │                │                  │
   │ message    │                │                  │
   │───────────>│ request.json   │                  │
   │            │───────────────>│ request.md       │
   │            │                │─────────────────>│
   │            │                │ response.md      │
   │            │                │<─────────────────│
   │            │ response.json  │                  │
   │            │<───────────────│                  │
   │ received.json               │                  │
   │<───────────│                │                  │
```

## Core Concepts

| Concept | Definition |
|---------|-----------|
| Normal Cycle | User input through server (with optional LLM) and back to client |
| Red Room | Client auto-replies to tool execute; no user input required |
| Gray Room | Server substeps before final client response |
| Black Room | Future proxy optimization (not active) |

### Red Room

Client auto-replies to tool `execute` (no user input):
- Trigger: Server asks for tool action
- Behavior: Client sends auto-result
- Next: Full cycle continues with result
- Meaning: Direct operational path for automatic tools

### Gray Room

Server-driven LLM/transform substeps before final client response:
- Trigger: Response transform emits `interrupt`
- Behavior: Server runs compress/thinking/re-LLM substeps
- Result: Client gets one response when chain ends
- Constraint: No extra `/next` calls for substeps (unlike red room)

### Black Room

Future smart loop inside `ai-integration` proxy:

- Planned area for proxy-side autonomous optimization logic.
- Out of current implementation scope.

## Phrase Mapping

- **"normal cycle"** -> regular message flow.
- **"red room"** -> client auto-replies to tool `execute`, then full cycle.
- **"gray room"** -> server-driven LLM/transform substep chain before final client response.
- **"black room"** -> future proxy intelligence loop (not active now).

